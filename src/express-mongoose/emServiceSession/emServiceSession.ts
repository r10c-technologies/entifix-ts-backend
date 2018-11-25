//CORE DEPENDENCIES
import mongoose = require('mongoose');
import amqp = require('amqplib/callback_api');

//CORE FRAMEWORK
import { AMQPConnectionDynamic, ExchangeDescription, QueueBindDescription } from '../../amqp-events/amqp-connection/amqpConnectionDynamic';
import { EMEntity, EntityDocument } from '../emEntity/emEntity';
import { IMetaDataInfo, EntityInfo, PersistenceType, AccessorInfo, ExpositionType, MemberBindingType} from '../../hc-core/hcMetaData/hcMetaData';
import { EMSession } from '../emSession/emSession';
import { PrivateUserData } from '../../hc-core/hcUtilities/interactionDataModels';
import { AMQPEvent } from '../../amqp-events/amqp-event/AMQPEvent';
import { AMQPDelegate } from '../../amqp-events/amqp-delegate/AMQPDelegate';

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
    private _urlMongoConnection : string;
    private _urlAmqpConnection : string;
    private _periodAmqpRetry;
    private _limitAmqpRetry;
    private _amqpExchangesDescription : Array<ExchangeDescription>;
    private _amqpQueueBindsDescription : Array<QueueBindDescription>;
    
    private _devMode : boolean;
    
    private _entitiesInfo : Array<{ 
        name: string, 
        info: EntityInfo, 
        schema: any, 
        models: Array<{ systemOwner: string, model: any}>, 
        activateType: (s : EMSession, d : EntityDocument) => any, 
        modelActivator : any
    }>;


    //#endregion


    
    //#region Methods

    constructor (serviceName: string, mongoService : string);
    constructor (serviceName: string, mongoService : string, amqpService : string);
    constructor (serviceName: string, mongoService : string, amqpService? : string)
    {
        this._serviceName = serviceName;
        this._entitiesInfo = [];
        this._brokerChannels = new Array<{name:string, instance: amqp.Channel}>();

        //Mongo Configuration
        this._urlMongoConnection = 'mongodb://' + mongoService;

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
        let connectDb = () => { this._mongooseConnection = mongoose.createConnection(this._urlMongoConnection) };

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

    
    getInfo(entityName : string) : EntityInfo
    {
        let infoRegister = this._entitiesInfo.find( e => e.name == entityName);

        if (!infoRegister)
            this.throwException('Entity not registered: ' + entityName );
        
        return infoRegister.info;   
    }

    getModel<TDocument extends EntityDocument>( entityName : string, systemOwner : string ) : mongoose.Model<TDocument>
    {
        let infoRegister = this._entitiesInfo.find( e => e.name == entityName);

        if (!infoRegister)
            this.throwException('Entity not registered: ' + entityName );

        if (this.isDevMode && !systemOwner)
            systemOwner = 'DEVELOPER';

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
            let modelName = 'DEV_'+ ei.name;
            let model = ei.modelActivator.activate( this._mongooseConnection, modelName, ei.schema );
            ei.models.push({ systemOwner: 'DEVELOPER', model });
        });
    }
    
    createSystemOwnerModels( systemOwner : string )
    {
        this._entitiesInfo.forEach( ei => {
            let modelName = systemOwner + '_'+ ei.name;
            let model = ei.modelActivator.activate( this._mongooseConnection, modelName, ei.schema );
            ei.models.push({ systemOwner, model });
        });
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




