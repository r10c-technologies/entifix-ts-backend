//Core Dependencies
import express = require('express');
import bodyParser = require('body-parser');
import cors = require('cors');
import amqp = require('amqplib/callback_api');
import redis = require('redis');
 

//Core Framework
import { Wrapper } from '../../hc-core/hcWrapper/hcWrapper';
import { TokenValidationRequest, TokenValidationResponse, PrivateUserData } from '../../hc-core/hcUtilities/interactionDataModels';
import { EMRouterManager } from '../emRouterManager/emRouterManager';
import { EntifixApplicationModule, IEntifixApplicationModuleModel } from './entifix-application-module';
import { EMServiceSession } from '../emServiceSession/emServiceSession';

interface EntifixAppConfig
{ 
    serviceName: string,
    mongoService : string, 
    amqpService? : string, 
    authCacheService? : string,
    authCacheServicePort? : number,
    authCacheDuration?: number,
    isMainService? : boolean,
    cors? : { enable: boolean, options?: cors.CorsOptions },
    devMode? : boolean,
    protectRoutes? : { enable: boolean, header?: string, path ? : string }
}


abstract class EntifixApplication 
{
    //#region Properties

    private _expressApp : express.Application;
    private _serviceSession : EMServiceSession;
    private _routerManager : EMRouterManager;

    private _authChannel : amqp.Channel;
    private _nameAuthQueue : string;
    private _assertAuthQueue : amqp.Replies.AssertQueue;
    private _authCacheClient : redis.RedisClient;

    //#endregion

    //#region methods

    //The constructor defines the main flow to create an Entifix Application
    constructor( port : number )
    {        
        //Create express instance app that is going to be used in the Http Server
        this.createExpressApp(port);
        
        //Create and connect the entifix session.
        //This function is async and it is possbile to override "onSessionCreated" method to modify the behavior when the session will be ready.
        // By default "onSessionCreated" do:
        // 1 => invoke "registerEntities" and "exposeEntities" methods. 
        // 2 => If the AMQP Service is enabled, the service will connect to broker depending of configurations. Main Service listen for modules atached, and no main service atach itself as a module.
        this.createServiceSession();
        
        //Sync functions for express middleware
        //Authentication, Cors, Healthcheck...
        this.createMiddlewareFunctions();
    
        //Default values
        this._nameAuthQueue = 'rpc_auth_queue';
    }   

    //Members that has to be implemented for inherited classes
    protected abstract get serviceConfiguration () :  EntifixAppConfig;
    protected abstract registerEntities() : void;
    protected abstract exposeEntities() : void;
    protected abstract validateToken(token : string, request?: express.Request) : Promise<TokenValidationResponse>;
    protected registerEventsAndDelegates() : void { };
    
    private createExpressApp ( port: number) : void
    {
        this._expressApp = express();
        this._expressApp.set('port', port);
    }

    private createServiceSession( ) : void
    {
        this._serviceSession = new EMServiceSession(this.serviceConfiguration.mongoService, this.serviceConfiguration.amqpService );
        this.configSessionAMQPConneciton();
        if (this.serviceConfiguration.devMode)
            this._serviceSession.enableDevMode();

        this._serviceSession.connect().then( ()=> this.onServiceSessionCreated() );
    }

    protected createMiddlewareFunctions() : void
    {
        //JSON parser
        this._expressApp.use( bodyParser.json() );

        //Enable cors if is required
        if (this.serviceConfiguration.cors && this.serviceConfiguration.cors.enable )
        {
            let defaultValues : cors.CorsOptions = this.serviceConfiguration.cors.options || {
                allowedHeaders: ["Origin", "Content-Type", "Accept", "Authorization"],
                credentials: true,
                methods: "GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE",
                preflightContinue: false
            };

            this._expressApp.use(cors(defaultValues));
        }

        //Health check
        this._expressApp.get('/', ( request:express.Request, response: express.Response )=> {            
            response.json({
                message: this.serviceConfiguration.serviceName + " is working correctly"
            });        
        });

        //Error handler
        this._expressApp.use( (error : any, request : express.Request, response : express.Response, next : express.NextFunction) => {
            let data : any;

            if (this.serviceConfiguration.devMode)
            {
                data = { serviceStatus: 'Developer mode is enabled.', helper: "The error was not ocurred without a Session context. The details were attached"};
                if (error)
                    data.errorDetails = { 
                        type: typeof error,
                        asString: error.toString != null ? error.toString() : null,
                        serialized: JSON.stringify(error),
                        message: error.message,
                        stack: error.stack
                    };
            }
                
            response.status(500).send(  Wrapper.wrapError( 'INTERNAL UNHANDLED EXCEPTION', data).serializeSimpleObject() );
        });

        //Protect routes
        let protectRoutes = this.serviceConfiguration.protectRoutes != null ? this.serviceConfiguration.protectRoutes.enable : true;
        let devMode = this.serviceConfiguration.devMode != null ? this.serviceConfiguration.devMode : false; 
        if (!protectRoutes && devMode)
            this._serviceSession.throwInfo('Routes unprotected');
        else
            this.protectRoutes();         
    }

    private protectRoutes() : void 
    {
        //Default values
        let pathProtected = this.serviceConfiguration.protectRoutes && this.serviceConfiguration.protectRoutes.path ? this.serviceConfiguration.protectRoutes.path : 'api';
        let header = this.serviceConfiguration.protectRoutes && this.serviceConfiguration.protectRoutes.header ? this.serviceConfiguration.protectRoutes.header : 'Authorization';

        //Register Function on express middleware
        this._expressApp.use('/'+ pathProtected, (request, response, next) => {

            let deniedAccess = (message, errorCode?, error?) => response.status(errorCode || 401).send( Wrapper.wrapError(message, error).serializeSimpleObject() );
            
            //TOKEN VALIDATION
            var token = request.get(header);
            if (!token)
            {
                deniedAccess('Authorization required');
                return;
            }
            
            this.validateToken(token, request).then(
                result => {
                    if (result.success)
                    {
                        (request as any).privateUserData = result.privateUserData;
                        next();
                    }
                    else
                        deniedAccess( result.message )
                },
                error => deniedAccess('Error on token validation', 500, this.serviceConfiguration.devMode ? error : null )                    
            );
            
        });
    } 

    protected onServiceSessionCreated() : void
    {
        this.registerEntities();
     
        if (this.serviceConfiguration.devMode)
            this._serviceSession.createDeveloperModels();
        
        this._routerManager = new EMRouterManager( this._serviceSession, this._expressApp ); 
        this.exposeEntities();

        if ( this.serviceConfiguration.amqpService)
        {
            if (this.isMainService)
                this._serviceSession.mainChannel.consume( 'modules_to_atach', message => this.saveModuleAtached(message));
             else
                this.atachModule( 'main_events', 'auth.module_atach' );
                
            this.createRPCAuthorizationDynamic();        
        }
        
        if ( this.serviceConfiguration.authCacheService )
        {
            this._authCacheClient = redis.createClient({ host: this.serviceConfiguration.authCacheService, port : this.serviceConfiguration.authCacheServicePort });

            this._authCacheClient.on( "error ", err => this._serviceSession.throwException(err));
        }

        this.registerEventsAndDelegates();
    }

    protected configSessionAMQPConneciton () : void
    {
        if (this.serviceConfiguration.amqpService)
        {
            this._serviceSession.amqpExchangesDescription = [ 
                { name: 'main_events', type: 'topic', durable: false }
            ];
            
            if (this.isMainService)
                this._serviceSession.amqpQueueBindsDescription = [ { name: 'modules_to_atach', exchangeName: 'main_events', routingKey: 'auth.module_atach', exclusive: true  } ];
        }
    }

    protected saveModuleAtached(message : amqp.Message ) : void
    {
        // var moduleAtached : { serviceModuleName: string, resources: Array<{ entityName : string, resourceName : string, basePath : string }> } = JSON.parse(message.content.toString());  
                             
        // this._serviceSession.getModel()
        // this._session.getModel<IEntifixApplicationModuleModel>("EntifixApplicationModule").find( { name: moduleAtached.serviceModuleName }, 
        //     ( err, res ) => {
        //         if (!err && res)
        //         {
        //             if (res.length == 0)
        //             {
        //                 let newModule = new EntifixApplicationModule(this._session);
        //                 newModule.name = moduleAtached.serviceModuleName;
        //                 newModule.resources = moduleAtached.resources;
        //                 newModule.save().then( () => this._serviceSession.brokerChannel.ack(message) );
        //             }
        //             else
        //             {
        //                 let module = new EntifixApplicationModule(this._session, res[0]);
        //                 module.name = moduleAtached.serviceModuleName;
        //                 module.resources = moduleAtached.resources;
        //                 module.save().then( () => this._serviceSession.brokerChannel.ack(message) );
        //             }
        //         }
        //     }
        // );
    }

    protected atachModule( exchangeName : string, routingKey : string) : void 
    {
        let message = {
            serviceModuleName : this.serviceConfiguration.serviceName,
            resources: this._routerManager.getExpositionDetails()
        };

        this._serviceSession.mainChannel.publish(exchangeName, routingKey, new Buffer(JSON.stringify(message)));
    }

    protected createRPCAuthorizationDynamic( ) : void
    {
        this._serviceSession.brokerConnection.createChannel( ( err, authChannel) => {
            if (!err)
            {
                this._authChannel = authChannel;

                if (this.isMainService) // Create RPC Worker
                {                    
                    authChannel.assertQueue(this._nameAuthQueue, {durable : false});
                    authChannel.prefetch(1);
                    
                    authChannel.consume(this._nameAuthQueue, message => {
                        let tokenRequest : TokenValidationRequest = JSON.parse(message.content.toString());
                        
                        this.processTokenValidationRequest(tokenRequest).then(
                            result => {
                                authChannel.sendToQueue(message.properties.replyTo, new Buffer(JSON.stringify(result)), { correlationId: message.properties.correlationId } );
                                authChannel.ack(message);
                            }
                        ).catch( error => {
                                let result : TokenValidationResponse = {
                                    success: false,
                                    error: error
                                };

                                authChannel.sendToQueue(message.properties.replyTo, new Buffer(JSON.stringify(result)), { correlationId: message.properties.correlationId } );
                                authChannel.ack(message);
                            }                            
                        );
                    });
                }
                else // Create RPC Client
                {
                    authChannel.assertQueue('', {exclusive : true }, (err, assertedQueue) => { 
                        if (!err)
                            this._assertAuthQueue = assertedQueue;
                        else
                            this._serviceSession.throwException("Cannot create Auth Queue");
                    });
                }
            }
            else
                this._serviceSession.throwException('Cannot create authorization channel');
        });
    }

    protected processTokenValidationRequest(tokenValidationRequest : TokenValidationRequest) : Promise<TokenValidationResponse>
    {
        this.serviceSession.throwException('No setted process for token validation request');
        return null;
    }

    protected requestTokenValidation(token : string, request : express.Request ) : Promise<TokenValidationResponse>  
    {
        return new Promise<TokenValidationResponse> ( 
            (resolve, reject) => 
            {
                let idReq = this.generateRequestTokenId();
                let serviceName = this.serviceConfiguration.serviceName;

                let tokenRequest : TokenValidationRequest = {
                    token,
                    path: request.path,
                    service: serviceName
                };

                this._authChannel.sendToQueue(this._nameAuthQueue, new Buffer(JSON.stringify( tokenRequest )), { correlationId : idReq, replyTo: this._assertAuthQueue.queue });

                this._authChannel.consume(this._assertAuthQueue.queue, message => {
                    if (message.properties.correlationId == idReq)
                    {
                        let validation : TokenValidationResponse = JSON.parse(message.content.toString());
                        resolve(validation);
                    }
                }, {noAck: true});
            }
        );
    }

    protected requestTokenValidationWithCache(token : string, request : express.Request) : Promise<TokenValidationResponse> 
    {
        return new Promise<TokenValidationResponse> (
            (resolve, reject) => 
            {
                this.getTokenValidationCache(token, request).then(
                    result => {
                        if (!result.exists)
                        {
                            this.requestTokenValidation(token, request).then(
                                res => {
                                    this.setTokenValidationCache(token, request, res).then(
                                        () => resolve(res),
                                        error => reject(error) 
                                    );                
                                },
                                error => reject(error)                    
                            );
                        }
                        else
                            resolve(result.cacheResult);               
                    },
                    error => reject(error)
                );
            }
        );
    }

    protected generateRequestTokenId () : string
    {
        return Math.random().toString() + Math.random().toString() + Math.random().toString();
    }


    protected getTokenValidationCache( token: string, request: express.Request ) : Promise<{exists: boolean, cacheResult? : TokenValidationResponse }>
    { 
        return new Promise<{exists: boolean, cacheResult? : TokenValidationResponse}> (
            (resolve, reject) => 
            {
                let keyCache = this.createKeyCache(token, request);
                this._authCacheClient.get(keyCache, ( error, value) => {
                    if (!error)
                    {
                        if (value)
                        {
                            let cacheResult : TokenValidationResponse = JSON.parse(value);
                            resolve( { exists: true, cacheResult });
                        }
                        else
                            resolve( { exists: false } );
                    }
                    else
                        reject(error);
                                        
                });                
            }
        )
    }

    protected setTokenValidationCache( token: string, request : express.Request, result : TokenValidationResponse ) : Promise<void>
    {
        return new Promise<void> (
            (resolve, reject) =>
            {
                let keyCache = this.createKeyCache(token,request);
                let resultString = JSON.stringify(result);
                this._authCacheClient.set( keyCache, resultString, 'EX', this.cacheExpiration, error => {
                    if (!error)
                        resolve();
                    else
                        reject(error);
                });
            }
        );
    }

    protected createKeyCache(token : string, request: express.Request) : string
    {
        // let keyCacheToProcess = token + '-' + request.method + '-' + request.originalUrl;
        // return crypto.createHash('sha256').update(keyCacheToProcess).digest().toString();

        return token + '-' + request.method + '-' + request.originalUrl;
    }

    //#endregion

    //#region Accessors

    private get isMainService()
    {
        return this.serviceConfiguration.isMainService != null ? this.serviceConfiguration.isMainService : false;
    }

    public get expressApp()
    { return this._expressApp }

    protected get routerManager()
    { return this._routerManager }

    private get cacheExpiration()
    {
        return this.serviceConfiguration.authCacheDuration || (60 * 5);
    }

    protected get serviceSession ()
    { return this._serviceSession; }

    //#endregion
}

export { EntifixApplication, EntifixAppConfig }