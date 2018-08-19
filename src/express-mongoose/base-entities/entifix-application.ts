//Core Dependencies
import express = require('express');
import bodyParser = require('body-parser');
import cors = require('cors');
import amqp = require('amqplib/callback_api');

//Core Framework
import { EMSession } from '../emSession/emSession';
import { EMRouterManager } from '../emRouterManager/emRouterManager';
import { EntifixApplicationModule, IEntifixApplicationModuleModel } from './entifix-application-module';

interface EntifixAppConfig
{ 
    serviceName: string,
    mongoService : string, 
    amqpService? : string, 
    isMainService? : boolean,
    cors? : { enable: boolean, options?: cors.CorsOptions },
    devMode? : boolean,
    protectRoutes? : { enable: boolean, header?: string, path ? : string },
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
    protected abstract validateToken(token : string) : Promise<{success : boolean, message : string}>;
    
    private createExpressApp ( port: number) : void
    {
        this._expressApp = express();
        this._expressApp.set('port', port);
    }

    private createEntifixSession( ) : void
    {
        this._session = new EMSession( this.serviceConfiguration.mongoService, this.serviceConfiguration.amqpService );

        if (this.serviceConfiguration.amqpService)
        {
            this._session.amqpExchangesDescription = [ 
                { name: 'main_events', type: 'topic', durable: false }
            ];
            
            if (this.isMainService)
                this._session.amqpQueueBindsDescription = [ { name: 'modules_to_atach', exchangeName: 'main_events', routingKey: 'auth.module_atach', exclusive: true  } ];
        }

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
                message: "Server working correctly"
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
        let pathProtected = this.serviceConfiguration.protectRoutes && this.serviceConfiguration.protectRoutes.path ? this.serviceConfiguration.protectRoutes.path : 'api';
        let header = this.serviceConfiguration.protectRoutes && this.serviceConfiguration.protectRoutes.header ? this.serviceConfiguration.protectRoutes.header : 'Authorization';

        this._expressApp.use('/'+ pathProtected, (request, response, next) => {

            let deniedAccess = (message?, errorCode?) => response.status(errorCode || 401).send( message ? { message: message } : null );
                
            var token = request.get(header);
            if (!token)
            {
                deniedAccess();
                return;
            }
            
            this.validateToken(token).then(
                result => {
                    if (result.success)
                        next();
                    else
                        deniedAccess( result.message );
                },
                error => deniedAccess('Error on token validation', 500)
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
                this._session.brokerChannel.consume( 'modules_to_atach', message => this.saveModuleAtached(message), { noAck: true });
             else
                this.atachModule( 'main_events', 'auth.module_atach' );

            this.createRPCAuthorizationDynamic();        
        }        
    }

    protected saveModuleAtached(message : amqp.Message ) : void
    {
        var moduleAtached : { moduleName: string, resources: Array<{ entityName : string, resourceName : string, basePath : string }> } = JSON.parse(message.content.toString());  
                                        
        this._session.getModel<IEntifixApplicationModuleModel>("EntifixApplicationModule").find( { name: moduleAtached.moduleName }, 
            ( err, res ) => {
                if (!err && res)
                {
                    if (res.length == 0)
                    {
                        let newModule = new EntifixApplicationModule(this._session);
                        newModule.name = moduleAtached.moduleName;
                        newModule.resources = moduleAtached.resources;
                        newModule.save();
                    }
                    else
                    {
                        let module = new EntifixApplicationModule(this._session, res[0]);
                        module.resources = moduleAtached.resources;
                        module.save();
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

    protected requesTokenValidation(token : string) : Promise<{success : boolean, message: string}>  
    {
        return new Promise<{success : boolean, message : string}>
        ( 
            (resolve, reject) => {

                let idReq = this.generateRequestId();

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

    protected generateRequestId () : string
    {
        return Math.random().toString() + Math.random().toString() + Math.random().toString();
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

    //#endregion
}

export { EntifixApplication, EntifixAppConfig }