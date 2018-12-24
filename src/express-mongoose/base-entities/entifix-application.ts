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
import { AMQPEventManager } from '../../amqp-events/amqp-event-manager/AMQPEventManager';
import { TokenValidationRequestRPC } from '../../amqp-events/amqp-base-events/TokenValidationRequestRPC';
import { TokenValidationResponseRPC } from '../../amqp-events/amqp-base-events/TokenValidationResponseRPC';
import { EMSession } from '../emSession/emSession';

interface EntifixAppConfig
{ 
    serviceName: string,
    mongoService : string | MongoServiceConfig, 
    amqpService? : string, 
    amqpDefaultInteraction?: boolean,
    authCacheService? : string,
    authCacheServicePort? : number,
    authCacheDuration?: number,
    isMainService? : boolean,
    cors? : { enable: boolean, options?: cors.CorsOptions },
    devMode? : boolean,
    protectRoutes? : { enable: boolean, header?: string, path ? : string }
}

interface MongoServiceConfig {
    user: string,
    password: string,
    url: string,
    base?: string
}

abstract class EntifixApplication 
{
    //#region Properties

    private _expressApp : express.Application;
    private _serviceSession : EMServiceSession;
    private _routerManager : EMRouterManager;
    private _eventManager: AMQPEventManager;

    private _authChannel : amqp.Channel;
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
        this._serviceSession = new EMServiceSession(this.serviceConfiguration.serviceName, this.serviceConfiguration.mongoService, this.serviceConfiguration.amqpService );
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
                    if (!result.error)
                    {
                        if (result.success)
                        {
                            (request as any).privateUserData = result.privateUserData;
                            next();
                        }
                        else if (result)
                            deniedAccess( result.message )
                    }
                    else
                        deniedAccess('Remote error on token validation', 500, this.serviceConfiguration.devMode ? result.error : null );
                }                   
            ).catch( error => deniedAccess('Error on token validation', 500, this.serviceConfiguration.devMode ? error : null ));
            
        });
    } 

    protected onServiceSessionCreated() : void
    {
        this.registerEntities();

        if (this.serviceConfiguration.devMode)
            this._serviceSession.createDeveloperModels();
        
        this._routerManager = new EMRouterManager( this._serviceSession, this._expressApp ); 
        this.exposeEntities();



        if ( this.serviceConfiguration.amqpService && this.useDefaultAMQPInteraction )
        {
            this._eventManager = this.serviceSession.createAndBindEventManager(); 
            this.createRPCAuthorizationDynamic();     
            this.registerEventsAndDelegates();
        }
        


        if ( this.serviceConfiguration.authCacheService )
        {
            this._authCacheClient = redis.createClient({ host: this.serviceConfiguration.authCacheService, port : this.serviceConfiguration.authCacheServicePort });

            this._authCacheClient.on( "error ", err => this._serviceSession.throwException(err));
        }

    }

    protected configSessionAMQPConneciton () : void
    {
        if ( this.useDefaultAMQPInteraction )
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
        if (this.isMainService)
            this._eventManager.registerDelegate( TokenValidationResponseRPC ).processTokenAction = tvr => this.processTokenValidationRequest(tvr);
        else
            this._eventManager.registerEvent( TokenValidationRequestRPC );
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
                let tokenValidationData = {
                    token, 
                    requestPath: request.path,
                    onResponse: tokenValidationResponse => resolve(tokenValidationResponse)
                };
                
                this._eventManager.publish('TokenValidationRequestRPC', tokenValidationData );           
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

    protected get eventManager()
    { return this._eventManager }

    private get cacheExpiration()
    { return this.serviceConfiguration.authCacheDuration || (60 * 5); }

    protected get serviceSession ()
    { return this._serviceSession; }
    
    get useDefaultAMQPInteraction()
    {
        return (this.serviceConfiguration.amqpService != null) && ( this.serviceConfiguration.amqpDefaultInteraction != false);
    }

    //#endregion
}

class TokenValidator 
{
    promise : Promise<TokenValidationResponse>;

    constructor(
        public idRequest : string,
        public serviceName, 
        public channel : amqp.Channel, 
        public token : string, 
        public request : express.Request,
        public authQueueName : string,
        public assertedQueue : amqp.Replies.AssertQueue) 
    {
        this.promise =  new Promise<TokenValidationResponse> ( 
            (resolve, reject) => 
            {
                let tokenRequest : TokenValidationRequest = {
                    token: this.token,
                    path: this.request.path
                };

                this.channel.sendToQueue(this.authQueueName, new Buffer(JSON.stringify( tokenRequest )), { correlationId : this.idRequest, replyTo: this.assertedQueue.queue });

                let consumer = (idReq, resolvePromise) => {
                    function onConsume(message : amqp.Message) 
                    {
                        if (message.properties.correlationId == this.idRequest) 
                        {
                            let validation : TokenValidationResponse = JSON.parse(message.content.toString());
                            resolvePromise(validation);
                        }
                    }
                }

                let newConsumerInstance = new Consumer( this.idRequest, resolve );

                this.channel.consume(
                    this.assertedQueue.queue,
                    newConsumerInstance.onConsume, 
                    {noAck: true}
                );
            }
        );

    }

}

function Consumer(idReq, resolvePromise) 
{
    this.onConsume = function(message : amqp.Message) 
    {
        let a = 3;
        let b = this;
        if (message.properties.correlationId == this.idRequest) 
        {
            let validation : TokenValidationResponse = JSON.parse(message.content.toString());
            resolvePromise(validation);
        }
    }
}

export { EntifixApplication, EntifixAppConfig, MongoServiceConfig }