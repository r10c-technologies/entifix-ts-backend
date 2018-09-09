//CORE DEPENDENCIES
import mongoose = require('mongoose');
import amqp = require('amqplib/callback_api');
import { MongooseDocument } from 'mongoose';

//CORE FRAMEWORK
import { HcSession } from '../../hc-core/hcSession/hcSession';
import { IMetaDataInfo, EntityInfo, PersistenceType, AccessorInfo} from '../../hc-core/hcMetaData/hcMetaData';
import { AMQPConnectionDynamic, ExchangeDescription, QueueBindDescription } from './amqpConnectionDynamic';
import { EMQueryWrapper } from '../emUtilities/emUtilities';
import { EMEntity, EntityDocument } from '../emEntity/emEntity';
import { Entity } from '../../hc-core/hcEntity/hcEntity';
 
class EMSession extends HcSession
{
    //#region Properties (Fields)

    //Connection instances
    private _mongooseInstance : any;
    private _mongooseConnection : mongoose.Connection;
    private _brokerConnection : amqp.Connection;
    private _brokerChannel : amqp.Channel;
        
    //Configuraion properties
    private _urlMongoConnection : string;
    private _urlAmqpConnection : string;
    private _periodAmqpRetry;
    private _limitAmqpRetry;
    private _amqpExchangesDescription : Array<ExchangeDescription>;
    private _amqpQueueBindsDescription : Array<QueueBindDescription>;
    
    // App Development
    private _devMode : boolean;
    
    //#endregion



    //#region Methods

    constructor (mongoService : string);
    constructor (mongoService : string, amqpService : string);
    constructor (mongoService : string, amqpService? : string)
    {
        super();

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

        if (this._urlAmqpConnection)
        {
            connectDb();
            return this.atachToBroker();
        }
        else
            return new Promise<void>( (resolve, reject) => {
                connectDb();
                resolve();
            });
            
    }
    
    private atachToBroker () : Promise<void>
    {        
        return new Promise<void>( (resolve, reject) => {
            AMQPConnectionDynamic.connect(this._urlAmqpConnection, { period: this._periodAmqpRetry, limit: this._limitAmqpRetry}).then(
                connection => {
                    this._brokerConnection = connection;
                    AMQPConnectionDynamic.createExchangeAndQueues( connection, this._amqpExchangesDescription, this._amqpQueueBindsDescription ).then(
                        channel => {
                            this._brokerChannel = channel;
                            resolve();
                        },
                        error => reject(error)
                    );
                }, 
                error => reject(error)
            );
        });
    }

    

    getModel<T extends EntityDocument >(entityName : string) : mongoose.Model<T>
    {
        return <mongoose.Model<T>>(this.entitiesInfo.find( e => e.name == entityName ).model);
    }
    
    getInfo(entityName : string) : EntityInfo
    {
        return this.entitiesInfo.find( info => info.name == entityName ).info as EntityInfo;   
    }


    //registerEntity<TDocument extends mongoose.Document, TEntity extends EMEntity>(entityName: string, structureSchema : Object, type: { new( session: EMSession, document : EntityDocument ) : TEntity} ) : void
    registerEntity<TDocument extends mongoose.Document, TEntity extends EMEntity>( type: { new( session: EMSession, document : EntityDocument ) : TEntity }, entityInfo : EntityInfo ) : void
    {
        //var info : EntityInfo = (<any>type).entityInfo; 
        var structureSchema = entityInfo.getCompleteSchema();
        var entityName = entityInfo.name;
        
        if (this.entitiesInfo.filter( e => e.name == entityName ).length == 0)
        {
            var schema : mongoose.Schema;
            var model : mongoose.Model<TDocument>;
            
            //schema = <mongoose.Schema>( this._mongooseInstance.Schema(structureSchema) );
            schema = new mongoose.Schema(structureSchema);
            model = this._mongooseConnection.model<TDocument>(entityName, schema);
            
            this.addEntityInfo( 
                { 
                    name: entityName,
                    info: entityInfo, 
                    schema: schema, 
                    model: model, 
                    activateType: (d : EntityDocument) => {
                        return new type(this, d);
                    }
                }
            );
        }
        else
            console.warn('Attempt to duplicate entity already registered: ' + entityName );
    }

    createDocument<T extends EntityDocument>(entityName: string, document: T ) : Promise<T>
    {   
        return new Promise<T>((resolve, reject)=>{
            let model = this.getModel<T>(entityName);
            this.manageDocumentCreation(document);
            model.create(document).then( 
                value => resolve(value), 
                error => reject( this.createError(error, 'Error in create document' )));
        });
    }

    updateDocument<T extends EntityDocument>(entityName: string, document: T ) : Promise<T>
    {   
        return new Promise<T>((resolve, reject)=>{        
            let model = this.getModel<T>(entityName);
            this.manageDocumentUpdate(document);
            model.findByIdAndUpdate( document._id, document, (error, result) => {
                if (!error)
                {
                    this.findDocument(entityName, document._id).then(
                        res => resolve(<T>res),
                        err => reject(err)
                    );
                }
                else
                    reject( this.createError(error, 'Error in update document') );
            } );
        });
    }


    listDocuments<T extends EntityDocument>(entityName: string) : Promise<Array<T>>;
    listDocuments<T extends EntityDocument>(entityName: string, options : ListOptions ) : Promise<Array<T>>;
    listDocuments<T extends EntityDocument>(entityName: string, options? : ListOptions ) : Promise<Array<T>>
    {        
        return new Promise<Array<T>>((resolve, reject)=>{

            //PREPARE QUERY PARAMETERS =====>>>>>           
            let skip = options != null && options.skip != null ? options.skip : 0;
            let take = options != null && options.take != null ? options.take : null;

            //Set mongo filters attending options.
            //First Monto object or SessionFilters instead
            let mongoFilters : any = options != null && options.mongoFilters ? options.mongoFilters : null;
            if (!mongoFilters)
            mongoFilters = this.resolveToMongoFilters(entityName, options != null && options.filters != null ? options.filters : null);
            if (mongoFilters.error)
                reject( this.createError( null, mongoFilters.message ));
            
            let mongoSorting = this.resolveToMongoSorting(entityName, options != null && options.sorting != null ? options.sorting : null);
            if ( mongoSorting != null && mongoSorting.error)
                reject( this.createError( null, mongoSorting.message ));
            

            //CREATE QUERY =====>>>>>
            let query = this.getModel<T>(entityName).find( mongoFilters.filters );

            if (mongoSorting != null && mongoSorting.sorting != null)
                query = query.sort( mongoSorting.sorting );
            
            if (skip > 0)
                query = query.skip(skip);
            if (take != null)
                query = query.limit(take);
            

            //EXECUTE QUERY =====>>>>>
            query.exec(( error, result ) => {
                if (!error)
                    resolve(result);   
                else
                     reject( this.createError(error, 'Error in retrive docments') );                
            });
        }); 
    }

    findDocument<T extends EntityDocument>(entityName : string, id: string ) : Promise<T>
    {
        return new Promise<T>( (resolve, reject ) => { 
            this.getModel<T>(entityName).where("deferredDeletion").ne(true).where("_id", id).then( 
                res => resolve( res != null && res.length > 0 ? res[0] : null ),
                err => reject ( this.createError(err, 'Error in retrive single document') ) 
            );
        });
    }

    deleteDocument<T extends EntityDocument>(entityName: string, document: T) : Promise<void>
    {        
        return new Promise<void>((resolve, reject)=>{        
            let model = this.getModel<T>(entityName);
            
            this.manageDocumentDeletion(document);

            model.findByIdAndUpdate( document._id, document, (error, result) => {
                if (!error)
                    resolve();
                else
                    reject ( this.createError(error, 'Error in delete document') );
            } );
        });
    }

    activateEntityInstance<TEntity extends EMEntity, TModel extends EntityDocument>(info: EntityInfo, document : TModel ) : Promise<TEntity>
    {        
        return new Promise<TEntity>( (resolve, reject) => {

            let baseInstace = <TEntity>this.entitiesInfo.find(a => a.name == info.name).activateType(document);

            let entityAccessors = info.getAccessors().filter( a => a.activator != null );
            if ( entityAccessors.length > 0)
            {
                let promises : Array<Promise<void>> = [];
                entityAccessors.forEach( entityAccessor => promises.push(entityAccessor.activator.activateMember( baseInstace, this, entityAccessor.name)));

                Promise.all(promises).then( 
                    () => resolve(baseInstace),
                    error => reject(this.createError(error, 'Error in create instance of a member'))
                );
            }
            else
                resolve(baseInstace);
        });
    }


    getMetadataToExpose(entityName : string) : Array<{ name : string, type : string, persistent : boolean}>
    {
        let info = <EntityInfo>(this.entitiesInfo.find( e => e.name == entityName).info);
        return info.getAccessors().filter(accessor => accessor.exposed).map( accessor => { 
            return { 
                name: accessor.name, 
                type: accessor.type, 
                persistent: (accessor.schema != null || accessor.persistenceType == PersistenceType.Auto ) 
            } 
        });
    }

    findEntity<TEntity extends EMEntity, TModel extends EntityDocument>( info: EntityInfo, id : string) : Promise<TEntity>
    {
        return new Promise<TEntity>( (resolve, reject) => 
        {
            this.findDocument<TModel>(info.name, id).then( 
                docResult => this.activateEntityInstance<TEntity, TModel>(info, docResult).then( entityInstance => resolve(entityInstance), error => reject(error) ),
                error => reject (error)
            )
        });
    }

    listEntities<TEntity extends EMEntity, TDocument extends EntityDocument>(entityName: string) : Promise<Array<TEntity>>;
    listEntities<TEntity extends EMEntity, TDocument extends EntityDocument>(entityName: string, options : ListOptions ) : Promise<Array<TEntity>>;
    listEntities<TEntity extends EMEntity, TDocument extends EntityDocument>(entityName: string, options? : ListOptions ) : Promise<Array<TEntity>>
    {        
        return new Promise<Array<TEntity>>((resolve, reject)=>{
            this.listDocuments<TDocument>(entityName, options).then(
                docsResult => 
                { 
                    let entities = new Array<TEntity>();
                    let promises = new Array<Promise<void>>();

                    docsResult.forEach( docResult => {
                        promises.push( this.activateEntityInstance<TEntity, TDocument>(this.getInfo(entityName), docResult).then( entity => { entities.push(entity) }));
                    });

                    Promise.all(promises).then(
                        () => resolve(entities),
                        error => reject(error) 
                    );
                },
                error => reject(error)
            );
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

    private createError(error : any, message : string)
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

    private manageDocumentCreation<TDocument extends EntityDocument>(document : TDocument) : void
    {
        document.created = new Date();
        document.deferredDeletion = false;
    }

    private manageDocumentUpdate<TDocument extends EntityDocument>(document : TDocument) : void
    {
        document.modified = new Date();
    }

    private manageDocumentDeletion<TDocument extends EntityDocument>(document : TDocument) : void
    {
        document.deleted = new Date();
        document.deferredDeletion = true;
    }

    private resolveToMongoFilters(entityName : string, filters? : Array<EMSessionFilter>) : { error : boolean, filters?: any, message? : string }
    {        
        let info : EntityInfo = this.entitiesInfo.find( f => f.name == entityName).info;
        

        //Cambio
        let persistentMembers = 
                info.getAllMembers()
                    .filter( m => (m instanceof AccessorInfo) && ( m.schema != null || m.persistenceType == PersistenceType.Auto) )
                    .map( m => { 
                        return  { property: m.name, type: m.type, alias : (m as AccessorInfo).serializeAlias } 
                    });


        //Filter for defferred deletion.
        let mongoFilters : any;
            
        // Convert all the fixed and optional filters in Mongoose Filetrs
        if (filters != null && filters.length > 0)
        {
            //mongoFilters = { $and : [ { deferredDeletion: { $in: [null, false] } } ] };  
            mongoFilters = { $and : [ { deferredDeletion: false } ] };
            let opFilters = [];
            let errFilters : string;

            //get all filters
            for (let filter of filters)
            {
                let pMember = persistentMembers.find( pm => pm.property == filter.property || pm.alias == filter.property);
                if (pMember == null)
                {
                    errFilters = 'Attempt to filter by a non persistent member';
                    break;
                }
                
                //Single mongo filter
                let mongoFilterConversion = this.parseMongoFilter( filter, pMember.type, pMember.property );
                if ( mongoFilterConversion.err)
                {   
                    errFilters = mongoFilterConversion.message;
                    break;
                }

                if (filter.filterType == FilterType.Fixed)
                    mongoFilters.$and.push( mongoFilterConversion.value );   
                
                if (filter.filterType == FilterType.Optional)
                    opFilters.push( mongoFilterConversion.value );
            }

            if( opFilters.length > 0)
            {
                if (opFilters.length > 1)
                    mongoFilters.$and.push( { $or: opFilters });
                else
                    mongoFilters.$and.push( opFilters[0] );
            }
                
            if (errFilters != null)
                return { error: true, message: errFilters }; 
        }
        else
        {
            //mongoFilters = { deferredDeletion: { $in: [null, false] }  };
            mongoFilters = { deferredDeletion: false };
        }
               
        
        return { error: false, filters: mongoFilters };
    }

    private parseMongoFilter( f : EMSessionFilter, propertyType : string, persistentName : string ) : { err : boolean, value?: any, message? : string }
    {           
        //Check and convert the filter value 
        let valueFilter : any; //value to mongo query
        switch(propertyType)
        {
            case 'Number':
                if ( isNaN(f.value as any) )
                    return { err: true, message: `The value for a filter in the property "${persistentName}" must be a number` };
                else
                    valueFilter = parseInt(f.value);
                break;

            default:
                valueFilter = f.value;
        };

        //Set the table of conversions for filters and mongo filters 
        let configConvesions : Array<{ operators : Array<string>, mongoOperator?: string, filterTypes?: Array<string>, valueModifier? : (v) => any }> =
        [
            { operators: ['=', 'eq'] },
            { operators: ['<>', 'ne'], mongoOperator: '$ne' },
            { operators: ['>=', 'gte'], mongoOperator: '$gte', filterTypes: ['Number', 'Date'],  },
            { operators: ['<=', 'lte'], mongoOperator: '$lte', filterTypes: ['Number', 'Date'] },
            { operators: ['>', 'gt'], mongoOperator: '$gt', filterTypes: ['Number', 'Date'] },
            { operators: ['<', 'lt'], mongoOperator: '$lt', filterTypes: ['Number', 'Date'] },
            { operators: ['lk'], mongoOperator: '$regex', filterTypes: ['String'], valueModifier: (v) => { return  '.*' + v + '.*'} }
        ];

        //Make the conversion 
        let confIndex = -1;
        
        let conf = configConvesions.find( cc => cc.operators.find( o  => o == f.operator) != null);
        if (conf != null)
        {
            valueFilter = conf.valueModifier != null ? conf.valueModifier(valueFilter) : valueFilter;

            if ( conf.filterTypes == null || ( conf.filterTypes != null && conf.filterTypes.find( at => at == propertyType ) != null) ) 
            {
                let value : any;

                if (conf.mongoOperator)
                    value = { [persistentName] : { [conf.mongoOperator ] : valueFilter} };
                else
                    value = { [persistentName] : valueFilter };
                    
                return { err: false, value };
            }                
            else
                return { err: true, message: `It is not possible to apply the the operator "${f.operator}" to the property "${persistentName}" because it is of type "${propertyType}"` };
        }
        else
            return { err: true, message: `Not valid operator ${f.operator} for filtering`};
    }

    private resolveToMongoSorting (entityName : string, sorting? : Array<EMSessionSort>) : { error : boolean, sorting?: any, message? : string }
    {        
        if (sorting != null && sorting.length > 0)
        {
            let info : EntityInfo = this.entitiesInfo.find( f => f.name == entityName).info;
            let persistentMembers = info.getAllMembers().filter( m => (m instanceof AccessorInfo) && m.schema != null ).map( m => { return  { property: m.name, type: m.type } } );

            let errSorting : string;
            let mongoSorting : any = {};

            for (let sort of sorting)
            {
                let pMember = persistentMembers.find( pm => pm.property == sort.property);
                if (pMember == null)
                {
                    errSorting = 'Attempt to sort by a non persistent member';
                    break;
                }
                
                let mst : string;
                if (sort.sortType == SortType.ascending)
                    mst = 'asc';
                if (sort.sortType == SortType.descending)
                    mst = 'desc'

                mongoSorting[sort.property] = mst; 
            }

            if (errSorting != null)
                return { error: true, message: errSorting };
                
            return { error: false, sorting: mongoSorting };
        }
        else
            return null;
        
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


    //#endregion



    //#region Accessors (Properties)

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

    get brokerChannel()
    { return this._brokerChannel; }

    get amqpExchangesDescription ()
    { return this._amqpExchangesDescription; }
    set amqpExchangesDescription (value)
    { this._amqpExchangesDescription = value; }

    get amqpQueueBindsDescription ()
    { return this._amqpQueueBindsDescription; }
    set amqpQueueBindsDescription (value)
    { this._amqpQueueBindsDescription = value; }

    //#endregion
}

class EMSessionError
{
    constructor (public error : any, public message : string )
    { }
}

interface EMSessionFilter
{
    property: string,
    operator: string,
    value: string,
    filterType: FilterType
}

interface EMSessionSort
{
    property: string,
    sortType : SortType
}

enum FilterType
{
    Fixed = 1,
    Optional = 2
}

enum SortType
{
    ascending = 1,
    descending = 2
}

interface ListOptions 
{ 
    filters? : Array<EMSessionFilter>, 
    skip? : number, 
    take? : number, 
    sorting? : Array<EMSessionSort>,
    mongoFilters? : any 
}

export { EMSession, EMSessionError, EMSessionFilter, FilterType, SortType, EMSessionSort, ListOptions }