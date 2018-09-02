//Core Dependencies
import express = require('express');
import bodyParser = require('body-parser');
import cors = require('cors');
import amqp = require('amqplib/callback_api');
import redis = require('redis');
import crypto = require ('crypto');
 

//Core Framework
import { EMSession } from '../emSession/emSession';
import { EMRouterManager } from '../emRouterManager/emRouterManager';
import { EntifixApplicationModule, IEntifixApplicationModuleModel } from './entifix-application-module';

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
    private _session : EMSession;
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
        
        //Create an connect the entifix session.
        //This function is async and it is possbile to override "onSessionCreated" method to modify the behavior when the session will be ready.
        // By default "onSessionCreated" do:
        // 1 => invoke "registerEntities" and "exposeEntities" methods. 
        // 2 => If the AMQP Service is enabled, the service will connect to broker depending of configurations. Main Service listen for modules atached, and no main service atach itself as a module.
        this.createEntifixSession();
        
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
    protected abstract validateToken(token : string, request?: express.Request) : Promise<{success : boolean, message : string}>;
    
    private createExpressApp ( port: number) : void
    {
        this._expressApp = express();
        this._expressApp.set('port', port);
    }

    private createEntifixSession( ) : void
    {
        this._session = new EMSession( this.serviceConfiguration.mongoService, this.serviceConfiguration.amqpService );
        this.configSessionAMQPConneciton();
        
        this._session.connect().then( ()=> this.onSessionCreated() );
    }

    private createMiddlewareFunctions() : void
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

        //Protect routes
        let protectRoutes = this.serviceConfiguration.protectRoutes != null ? this.serviceConfiguration.protectRoutes.enable : true;
        let devMode = this.serviceConfiguration.devMode != null ? this.serviceConfiguration.devMode : false; 
        if (!protectRoutes && devMode)
            this._session.throwInfo('Routes unprotected');
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

            let deniedAccess = (message?, errorCode?) => response.status(errorCode || 401).send( message ? { message: message } : null );
            
            //TOKEN VALIDATION
            var token = request.get(header);
            if (!token)
            {
                deniedAccess();
                return;
            }
            
            this.validateToken(token, request).then(
                result => {
                    if (result.success)
                        next();
                    else
                        deniedAccess( result.message )
                },
                error => deniedAccess(this._session.errorMessage('Error on token validation', error), 500)                    
            );
            
        });
    } 

    protected onSessionCreated() : void
    {
        this.registerEntities();
        
        this._routerManager = new EMRouterManager( this._session, this._expressApp ); 
        this.exposeEntities();

        if ( this.serviceConfiguration.amqpService)
        {
            if (this.isMainService)
                this._session.brokerChannel.consume( 'modules_to_atach', message => this.saveModuleAtached(message));
             else
                this.atachModule( 'main_events', 'auth.module_atach' );
                
            this.createRPCAuthorizationDynamic();        
        }
        
        if ( this.serviceConfiguration.authCacheService )
        {
            this._authCacheClient = redis.createClient({ host: this.serviceConfiguration.authCacheService, port : this.serviceConfiguration.authCacheServicePort });

            this._authCacheClient.on( "error ", err => this._session.throwException(err));
        }
    }

    protected configSessionAMQPConneciton () : void
    {
        if (this.serviceConfiguration.amqpService)
        {
            this._session.amqpExchangesDescription = [ 
                { name: 'main_events', type: 'topic', durable: false }
            ];
            
            if (this.isMainService)
                this._session.amqpQueueBindsDescription = [ { name: 'modules_to_atach', exchangeName: 'main_events', routingKey: 'auth.module_atach', exclusive: true  } ];
        }
    }

    protected saveModuleAtached(message : amqp.Message ) : void
    {
        var moduleAtached : { serviceModuleName: string, resources: Array<{ entityName : string, resourceName : string, basePath : string }> } = JSON.parse(message.content.toString());  
                                        
        this._session.getModel<IEntifixApplicationModuleModel>("EntifixApplicationModule").find( { name: moduleAtached.serviceModuleName }, 
            ( err, res ) => {
                if (!err && res)
                {
                    if (res.length == 0)
                    {
                        let newModule = new EntifixApplicationModule(this._session);
                        newModule.name = moduleAtached.serviceModuleName;
                        newModule.resources = moduleAtached.resources;
                        newModule.save().then( () => this._session.brokerChannel.ack(message) );
                    }
                    else
                    {
                        let module = new EntifixApplicationModule(this._session, res[0]);
                        module.name = moduleAtached.serviceModuleName;
                        module.resources = moduleAtached.resources;
                        module.save().then( () => this._session.brokerChannel.ack(message) );
                    }
                }
            }
        );
    }

    protected atachModule( exchangeName : string, routingKey : string) : void 
    {
        let message = {
            serviceModuleName : this.serviceConfiguration.serviceName,
            resources: this._routerManager.getExpositionDetails()
        };

        this.session.brokerChannel.publish(exchangeName, routingKey, new Buffer(JSON.stringify(message)));
    }

    protected createRPCAuthorizationDynamic( ) : void
    {
        this._session.brokerConnection.createChannel( ( err, authChannel) => {
            if (!err)
            {
                this._authChannel = authChannel;

                if (this.isMainService) // Create RPC Worker
                {                    
                    authChannel.assertQueue(this._nameAuthQueue, {durable : false});
                    authChannel.prefetch(1);
                    
                    authChannel.consume(this._nameAuthQueue, message => {
                        let data : { token : string } = JSON.parse(message.content.toString());
                        
                        this.validateToken( data.token ).then( 
                            result => { 
                                authChannel.sendToQueue(message.properties.replyTo, new Buffer(JSON.stringify(result)), { correlationId: message.properties.correlationId } );
                                authChannel.ack(message);
                            },
                            error => {
                                let result = {
                                    success: false,
                                    message: error.message
                                }

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
                            this._session.throwException("Cannot create Auth Queue");
                    });
                }
            }
            else
                this._session.throwException('Cannot create authorization channel');
        });
    }

    protected requestTokenValidation(token : string) : Promise<{success : boolean, message: string}>  
    {
        return new Promise<{success : boolean, message : string}> ( 
            (resolve, reject) => 
            {
                let idReq = this.generateRequestTokenId();

                this._authChannel.sendToQueue(this._nameAuthQueue, new Buffer(JSON.stringify({ token })), { correlationId : idReq, replyTo: this._assertAuthQueue.queue });

                this._authChannel.consume(this._assertAuthQueue.queue, message => {
                    if (message.properties.correlationId == idReq)
                    {
                        let responseData : {success:boolean, message:string} = JSON.parse(message.content.toString());
                        resolve(responseData);
                    }
                }, {noAck: true});
            }
        );
    }

    protected requestTokenValidationWithCache(token : string, request : express.Request) : Promise<{success : boolean, message: string}> 
    {
        return new Promise<{success : boolean, message : string}> (
            (resolve, reject) => 
            {
                this.getTokenValidationCache(token, request).then(
                    result => {
                        if (!result.exists)
                        {
                            this.requestTokenValidation(token).then(
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


    protected getTokenValidationCache( token: string, request: express.Request ) : Promise<{exists: boolean, cacheResult? : { success:boolean, message:string }}>
    { 
        return new Promise<{exists: boolean, cacheResult? : { success:boolean, message:string }}> (
            (resolve, reject) => 
            {
                let keyCache = this.createKeyCache(token, request);
                this._authCacheClient.get(keyCache, ( error, value) => {
                    if (!error)
                    {
                        if (value)
                        {
                            let cacheResult : { success: boolean, message: string } = JSON.parse(value);
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

    protected setTokenValidationCache( token: string, request : express.Request, result : { success: boolean, message : string} ) : Promise<void>
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

    protected get session()
    { return this._session; }

    public get expressApp()
    { return this._expressApp }

    protected get routerManager()
    { return this._routerManager }

    private get cacheExpiration()
    {
        return this.serviceConfiguration.authCacheDuration || (60 * 5);
    }

    //#endregion
}

export { EntifixApplication, EntifixAppConfig }