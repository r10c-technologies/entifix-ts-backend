//CORE DEPENDENCIES
import mongoose = require('mongoose');
import amqp = require('amqplib/callback_api');

//CORE FRAMEWORK
import { AMQPConnectionDynamic, ExchangeDescription, QueueBindDescription } from '../../amqp-events/amqp-connection/amqpConnectionDynamic';
import { EMEntity, EntityDocument } from '../emEntity/emEntity';
import { IMetaDataInfo, EntityInfo, PersistenceType, AccessorInfo, ExpositionType, MemberBindingType, MethodInfo} from '../../hc-core/hcMetaData/hcMetaData';
import { EMSession } from '../emSession/emSession';
import { PrivateUserData } from '../../hc-core/hcUtilities/interactionDataModels';
import { AMQPEvent } from '../../amqp-events/amqp-event/AMQPEvent';
import { AMQPDelegate } from '../../amqp-events/amqp-delegate/AMQPDelegate';
import { AMQPEventManager } from '../../amqp-events/amqp-event-manager/AMQPEventManager';
import { MongoServiceConfig } from '../base-entities/entifix-application';

class EMServiceSession
{
    //#region Properties
    
    //Connection instances
    private _serviceName : string;
    private _mongooseInstance : any;
    private _mongooseConnection : mongoose.Connection;
    private _brokerConnection : amqp.Connection;
    private _brokerChannels : Array<{ name:string, instance:amqp.Channel}>;
        
    //Configuraion properties
    private _mongoServiceConfig : string | MongoServiceConfig;
    private _urlAmqpConnection : string;
    private _periodAmqpRetry;
    private _limitAmqpRetry;
    private _amqpExchangesDescription : Array<ExchangeDescription>;
    private _amqpQueueBindsDescription : Array<QueueBindDescription>;
    private _devMode : boolean;
    private _allowFixedSystemOwners : boolean;

    //Main artifact instances
    private _amqpEventManager : AMQPEventManager;
    
    private _entitiesInfo : Array<{ 
        name: string, 
        info: EntityInfo, 
        schema: any, 
        models: Array<{ systemOwner: string, model: any}>, 
        activateType: (s : EMSession, d : EntityDocument) => any, 
        modelActivator : any
    }>;

    //Utilities
    private _userDevDataNotification = false;

    //#endregion


    
    //#region Methods

    constructor (serviceName: string, mongoService : string | MongoServiceConfig);
    constructor (serviceName: string, mongoService : string | MongoServiceConfig, amqpService : string);
    constructor (serviceName: string, mongoService : string | MongoServiceConfig, amqpService? : string)
    {
        this._serviceName = serviceName;
        this._entitiesInfo = [];
        this._brokerChannels = new Array<{name:string, instance: amqp.Channel}>();
        this._allowFixedSystemOwners = false;

        //Mongo Configuration
        this._mongoServiceConfig = mongoService;

        //AMQP Configuration
        if (amqpService)
        {
            this._urlAmqpConnection = 'amqp://' + amqpService;
        
            //defaluts
            this._limitAmqpRetry = 10;
            this._periodAmqpRetry = 2000;
        }
    }

    connect( ) : Promise<void>
    {
        let connectDb = () => { 
            if (typeof this._mongoServiceConfig == "string")
            {
                let url = 'mongodb://' + this._mongoServiceConfig;
                this._mongooseConnection = mongoose.createConnection(url); 
            }
            else
            {
                let config = this._mongoServiceConfig as MongoServiceConfig;
                let base = config.base || 'mongodb://';
                let url = base + config.url;
                this._mongooseConnection = mongoose.createConnection( url, { user: config.user, pass: config.password } );
            }            
        };
        
        return new Promise<void>((resolve,reject)=>{
            connectDb();
            if (this._urlAmqpConnection)
                this.atachToBroker().then( () => resolve()).catch( error => reject(error));
            else
                resolve();
        });            
    }
    
    private atachToBroker () : Promise<void>
    {        
        return new Promise<void>( (resolve, reject) => {
            AMQPConnectionDynamic.connect(this._urlAmqpConnection, { period: this._periodAmqpRetry, limit: this._limitAmqpRetry}).then(
                connection => {
                    this._brokerConnection = connection;
                    resolve();
                }
            ).catch(err => reject(err));
        });
    }

    createAndBindEventManager( ) : AMQPEventManager
    {
        this._amqpEventManager = new AMQPEventManager(this);
        return this._amqpEventManager;
    }

    publishAMQPMessage( session : EMSession, eventName: string, data : any ) : void
    {
        if (this._amqpEventManager)
            this._amqpEventManager.publish(eventName, data, { session });
        else
            this.throwException('No AMQP Event manager binded');
    }
    
    publishAMQPAction( session : EMSession, methodInfo : MethodInfo, entityId: string, data : any ) : void
    {
        if (this._amqpEventManager)
            this._amqpEventManager.publish(methodInfo.eventName, data, { session, entityName: methodInfo.className, actionName: methodInfo.name, entityId });
        else
            this.throwException('No AMQP Event manager binded');
    }

    getInfo(entityName : string) : EntityInfo
    {
        let infoRegister = this._entitiesInfo.find( e => e.name == entityName);

        if (!infoRegister)
            this.throwException('Entity not registered: ' + entityName );
        
        return infoRegister.info;   
    }

    getModel<TDocument extends EntityDocument>( entityName : string, systemOwner : string ) : mongoose.Model<TDocument>;
    getModel<TDocument extends EntityDocument>( entityName : string, systemOwner : string, options: { forceCreation?: boolean } ) : mongoose.Model<TDocument>;
    getModel<TDocument extends EntityDocument>( entityName : string, systemOwner : string, options?: { forceCreation?: boolean } ) : mongoose.Model<TDocument>
    {
        options = options || {};

        if (options.forceCreation == true)
            this.verifySystemOwnerModels(systemOwner);

        let infoRegister = this._entitiesInfo.find( e => e.name == entityName);

        if (!infoRegister)
            this.throwException('Entity not registered: ' + entityName );

        if (this.isDevMode && !systemOwner)
            systemOwner = this.developerUserData.systemOwner;

        let modelRegister = infoRegister.models.find( m => m.systemOwner == systemOwner );

        if (!modelRegister)
            this.throwException(`Model ${entityName} not registered for System Owner ${systemOwner}`);

        return modelRegister.model;
    }

    registerEntity<TDocument extends mongoose.Document, TEntity extends EMEntity>( type: { new( session: EMSession, document : EntityDocument ) : TEntity }, entityInfo : EntityInfo ) : void
    {
        var structureSchema = entityInfo.getCompleteSchema();
        var entityName = entityInfo.name;
        
        if (this.entitiesInfo.filter( e => e.name == entityName ).length == 0)
        {
            var schema : mongoose.Schema;
            var model : mongoose.Model<TDocument>;
            
            schema = new mongoose.Schema(structureSchema);
            
            this._entitiesInfo.push( { 
                name: entityName,
                info: entityInfo, 
                schema: schema, 
                models: [], 
                activateType: (s : EMSession, d : EntityDocument) => {
                    return new type(s, d);
                },
                modelActivator: new ModelActivator<TDocument>()
            });
        }
        else
            console.warn('Attempt to duplicate entity already registered: ' + entityName );
    }

    createDeveloperModels()
    {
        this._entitiesInfo.forEach( ei => {

            let devData = this.developerUserData;
            let modelName = devData.systemOwner  + '_' + ei.name;
            let model = ei.modelActivator.activate( this._mongooseConnection, modelName, ei.schema );
            ei.models.push({ systemOwner: devData.systemOwner, model });
        });
    }
    
    verifySystemOwnerModels( systemOwner : string )
    {
        if (this._entitiesInfo.filter( ei => ei.models.find( m => m.systemOwner == systemOwner) != null ).length == 0)
        {
            this._entitiesInfo.forEach( ei => {
                let modelName = systemOwner + '_'+ ei.name;
                let model = ei.modelActivator.activate( this._mongooseConnection, modelName, ei.schema );
                ei.models.push({ systemOwner, model });
            });
        }
    }

    enableDevMode () : void
    {
        this._devMode = true;
    }

    disableDevMode () : void
    {
        this._devMode = false;
    }

    throwException (message : string) : void
    {
        if (this._devMode)
            console.error('DEV-MODE: ' + message);
        else
            throw new Error(message);
    }
    
    logInDevMode( message : string );
    logInDevMode( message : string, type : string);
    logInDevMode( message : string, type? : string)
    {
        if (this._devMode == true)
        {
            let msg = 'DEV-MODE: ' + message;

            switch (type)
            {
                case 'error':
                    console.error(msg);
                    break;
                case 'warn':
                    console.warn(msg);
                    break;
                case 'info':
                    console.info(msg);
                    break;
                default:
                    console.log(msg);
            }
        }
    }

    throwInfo(message : string) : void;
    throwInfo(message : string, warnDevMode : boolean) : void;
    throwInfo(message : string, warnDevMode? : boolean) : void
    {
        warnDevMode = warnDevMode != null ? warnDevMode : true;

        if (warnDevMode && this._devMode)
            console.warn('DEV-MODE: ' + message);
        else
            console.info(message);
    }
    
    createError(error : any, message : string)
    {
        if (this._devMode)
        {
            let m = 'DevMode: Error in EMSession => ' + message;
            console.warn(m);    
            return new EMSessionError(error, m);
        }
        else
            return new EMSessionError(null, 'INTERNAL SERVER ERROR');
    }

    checkAMQPConnection () : void
    {
        if (!this._urlAmqpConnection || !this._brokerConnection)
            this.throwException('No AMQP service enabled');
    }

    enableFixedSystemOwners() : void
    {
        this._allowFixedSystemOwners = true;
    }

    //#endregion



    //#region Accessors

    get serviceName()
    { return this._serviceName; }

    get entitiesInfo ()
    { return this._entitiesInfo; }
   
    get isDevMode()
    { return this._devMode; }

    get periodAmqpRetry ()
    { return this._periodAmqpRetry; }
    set periodAmqpRetry (value)
    { this._periodAmqpRetry = value; }

    get limitAmqpRetry ()
    { return this._limitAmqpRetry; }
    set limitAmqpRetry (value)
    { this._limitAmqpRetry = value; }

    get mongooseConnection()
    { return this._mongooseConnection; }

    get brokerConnection()
    { return this._brokerConnection; }

    get brokerChannels()
    { return this._brokerChannels; }

    get amqpExchangesDescription ()
    { return this._amqpExchangesDescription; }
    set amqpExchangesDescription (value)
    { this._amqpExchangesDescription = value; }

    get amqpQueueBindsDescription ()
    { return this._amqpQueueBindsDescription; }
    set amqpQueueBindsDescription (value)
    { this._amqpQueueBindsDescription = value; }

    get mainChannel ()
    {
        let mc = this._brokerChannels.find( c => c.name == 'mainChannel' );

        if (!mc)
            this.throwException('Main broker channel not found');

        return mc.instance;
    }

    get developerUserData () : PrivateUserData
    {
        if (this.isDevMode) 
        {
            if (!this._userDevDataNotification)
            {
                this.logInDevMode('Using private user data for developer in the created sessions');
                this._userDevDataNotification = true;
            }
            
            return {
                name: 'LOCAL DEVELOPER',
                userName: 'DEVELOPER',
                systemOwner: 'DEVELOPER',
                idUser: null 
            }
        }
        else
        {
            this.throwException('It is not possible to use the Developer User Data without activate DevMode');
            return null;
        }
    }

    get allowFixedSystemOwners ()
    { return this._allowFixedSystemOwners; }

    //#endregion
}

class ModelActivator<T extends mongoose.Document>
{
    constructor() { }

    activate( mongooseConnection : mongoose.Connection, name : string, schema : mongoose.Schema ) : mongoose.Model<T>
    {
        return mongooseConnection.model<T>(name, schema);
    }
}





class EMSessionError
{
    //#region Properties

    private _code : number;
    private _error : any;
    private _message: string;
    private _isHandled : boolean;

    //#endregion

    //#region Methods
    
    constructor (error : any, message : string ) 
    { 
        this._error = error;
        this._message = message;

        this._code = 500;
    }    

    setAsHandledError( code : number, message : string) : void
    {
        this._code = code;
        this._message = message;

        this._isHandled = true;
    }

    //#endregion

    //#region Accessors
    
    get error()
    { return this._error; }
    
    get message()
    { return this._message; }
    
    get code()
    { return this._code; }
    
    get isHandled()
    { return this._isHandled; }
    
    //#endregion
}

export { EMServiceSession, EMSessionError }




