//CORE DEPENDENCIES
import mongoose = require('mongoose');
import amqp = require('amqplib/callback_api');
import express = require ('express');

//CORE FRAMEWORK
import { HcSession } from '../../hc-core/hcSession/hcSession';
import { IMetaDataInfo, EntityInfo, PersistenceType, AccessorInfo, ExpositionType, MemberBindingType, MethodInfo} from '../../hc-core/hcMetaData/hcMetaData';
import { EMEntity, EntityDocument } from '../emEntity/emEntity';
import { EMServiceSession } from '../emServiceSession/emServiceSession'; 
import { PrivateUserData } from '../../hc-core/hcUtilities/interactionDataModels';
import { filter } from 'bluebird';

class EMSession extends HcSession
{
    //#region Properties (Fields)

    private _request : express.Request;
    private _response : express.Response;
    protected _privateUserData : PrivateUserData;
    protected _serviceSession: EMServiceSession;
    
    //#endregion



    //#region Methods

    constructor( serviceSession : EMServiceSession, options: { request : express.Request, response : express.Response } );
    constructor( serviceSession : EMServiceSession, options: { privateUserData : PrivateUserData } );
    constructor( serviceSession : EMServiceSession, options: { request? : express.Request, response? : express.Response, privateUserData? : PrivateUserData } )
    {
        super();
    
        this._serviceSession = serviceSession;
        this._request = options.request;
        this._response = options.response;
        
        let puData = options.privateUserData;

        if (!puData)
            puData = this._request ? (this._request as any).privateUserData : null;
            
        if (!puData && this._serviceSession.isDevMode)
            puData = this._serviceSession.getDeveloperUserData();

        if (!puData)
            this.serviceSession.throwException('There is no private user data for the session');
        
        this._privateUserData = puData;
        this._serviceSession.verifySystemOwnerModels(this._privateUserData.systemOwnerSelected);
    }
    
    getModel<T extends EntityDocument >(entityName : string) : mongoose.Model<T>
    {       
        let info = this.getInfo( entityName );
        let systemOwner = this.serviceSession.allowFixedSystemOwners && info.fixedSystemOwner ? info.fixedSystemOwner : this._privateUserData.systemOwnerSelected;

        return this._serviceSession.getModel(entityName, systemOwner);
    }

    getInfo(entityName : string ) : EntityInfo
    {
        return this._serviceSession.getInfo(entityName);
    }
         
    createDocument<T extends EntityDocument>(entityName: string, document: T ) : Promise<T>
    {   
        return new Promise<T>((resolve, reject)=>{
            this.manageDocumentCreation(document);
            document.save().then(
                value => resolve(value), 
                error => reject( this.createError(error, 'Error in create document' ))
            );

        });
    }

    updateDocument<T extends EntityDocument>(entityName: string, document: T ) : Promise<T>
    {   
        return new Promise<T>((resolve, reject)=>{        
            let model = this.getModel<T>(entityName);
            this.manageDocumentUpdate(document);

            document.update( document, (error, result) => {
                if (!error)
                {
                    model.findById(document._id,(err, doc) =>{
                        if (err)
                            reject( this.createError(err, 'The document was updated but it could not be reloaded') );
                        else
                            resolve(doc);   
                    });
                }
                else
                    reject( this.createError(error, 'Error in update document') );
            });

        });
    }


    listDocuments<T extends EntityDocument>(entityName: string) : Promise<ListDocsResultDetails<T>>;
    listDocuments<T extends EntityDocument>(entityName: string, options : ListOptions ) : Promise<ListDocsResultDetails<T>>;
    listDocuments<T extends EntityDocument>(entityName: string, options? : ListOptions ) : Promise<ListDocsResultDetails<T>>
    {        
        return new Promise<ListDocsResultDetails<T>>((resolve, reject)=>{

            //PREPARE QUERY PARAMETERS =====>>>>>           
            let skip = options != null && options.skip != null ? options.skip : 0;
            let take = options != null && options.take != null ? options.take : null;

            //Set mongo filters attending options.
            //First Monto object or SessionFilters instead
            let mongoFilters : any = options != null && options.mongoFilters ? options.mongoFilters : null;
            if (!mongoFilters)
            {
                let filters = options && options.filters ? options.filters : [];

                if (this._anchoredFiltering)
                {
                    if (this._anchoredFiltering instanceof Array)
                        filters = filters.concat(this._anchoredFiltering);
                    else
                        filters.push(this._anchoredFiltering);
                }

                mongoFilters = this.resolveToMongoFilters(entityName, filters);
            }
                
            if (mongoFilters.error)
            {
                let errorData = {
                    helper: 'Error ocurred on filters validation',
                    details: mongoFilters.message
                }
                let error = this.createError( errorData, null );
                error.setAsHandledError(400, 'Bad Query Param');

                reject( error );
            }
            
            let mongoSorting = this.resolveToMongoSorting(entityName, options != null && options.sorting != null ? options.sorting : null);
            if ( mongoSorting != null && mongoSorting.error)
            {
                let errorData = {
                    helper: 'Error ocurred on sorting params validation',
                    details: mongoFilters.message
                }

                let error = this.createError( errorData, null );
                error.setAsHandledError(400, 'Bad Query Param');
                
                reject( error );
            }                
            
            //CREATE QUERY =====>>>>>
            let query = this.getModel<T>(entityName).find( mongoFilters.filters );
            let countQuery = this.getModel<T>(entityName).find( mongoFilters.filters );

            if (mongoSorting != null && mongoSorting.sorting != null)
                query = query.sort( mongoSorting.sorting );
            
            if (skip > 0)
                query = query.skip(skip);
            if (take != null)
                query = query.limit(take);
                        
            //EXECUTE QUERIES =====>>>>>
            let results : Array<T>;
            let count : number;
            let lastError : any;
            let listResolved = false, countResolved = false, fullResolved = false;
            
            query.exec( ( err, resultQuery) => { 
                if (!err)
                    results = resultQuery;
                else
                    lastError = err;

                listResolved = true;
                if (listResolved && countResolved)
                    resolvePromise();
            });

            countQuery.count((err, resultCount) => {
                if (!err)
                    count = resultCount;
                else
                    lastError = err;

                countResolved = true;
                if (listResolved && countResolved)
                    resolvePromise();
            });

            var resolvePromise = () => {
                if (!fullResolved)
                {
                    fullResolved = true;
                    if (!lastError)
                    {
                        let details : any = { total: count };
                        if (skip > 0 ) details.skip = skip;
                        if (take != null ) details.take = take;

                        resolve( { docs: results, details } )
                    }
                    else
                        reject( lastError );                    
                }                
            };

        }); 
    }

    findDocument<T extends EntityDocument>(entityName : string, id: string ) : Promise<T>
    {
        return new Promise<T>( (resolve, reject ) => { 
            this.getModel<T>(entityName).findById ( id.trim(), (err, res) => {
                if (!err)
                {
                    if (res && ( res.deferredDeletion == null || res.deferredDeletion == false ) ) 
                        resolve( res );
                    else
                        resolve( null );
                }
                else
                    reject ( this.createError(err, 'Error in retrive single document') );
            });
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

    activateEntityInstance<TEntity extends EMEntity, TModel extends EntityDocument>(info: EntityInfo, document : TModel ) : Promise<TEntity>;
    activateEntityInstance<TEntity extends EMEntity, TModel extends EntityDocument>(info: EntityInfo, document : TModel, options : { changes : Array<{ property: string, oldValue : any, newValue: any }> } ) : Promise<TEntity>;
    activateEntityInstance<TEntity extends EMEntity, TModel extends EntityDocument>(info: EntityInfo, document : TModel, options? : { changes : Array<{ property: string, oldValue : any, newValue: any }> } ) : Promise<TEntity>
    {        
        return new Promise<TEntity>( (resolve, reject) => {

            let changes = options && options.changes ? options.changes : [];

            let baseInstace = this._serviceSession.entitiesInfo.find(a => a.name == info.name).activateType(this, document);

            // let entityAccessors = info.getAccessors().filter( a => a.activator != null && ( a.type == "Array" ? baseInstace[a.name] != null && baseInstace[a.name].length > 0 : baseInstace[a.name] != null ) );
            let entityAccessors = info.getAccessors().filter( a => a.activator != null );
            
            let currentEA = entityAccessors.filter( ea => { 
                let persistentName = ea.persistentAlias || ea.name;
                
                if ( ea.type == 'Array' )
                    return document[persistentName] != null && document[persistentName].length > 0; 
                else
                    return document[persistentName] != null; 
            });
            
            let previousEA = entityAccessors.filter( ea => {
                let persistetName = ea.persistentAlias || ea.name;

                let c = changes.find( c => c.property == persistetName );
                if (c) 
                    return c.oldValue != null
                else
                    return false;
            });

            if ( previousEA.length > 0 || currentEA.length > 0)
            {
                let promises : Array<Promise<void>> = [];
                
                entityAccessors.forEach( entityAccessor => {

                    let oldValue : any;
                    if (options && options.changes)
                    {
                        let c = options.changes.find( c => c.property == ( entityAccessor.persistentAlias || entityAccessor.name ) );
                        if (c)
                            oldValue = c.oldValue;                        
                    }
                        
                    promises.push(entityAccessor.activator.activateMember( baseInstace, this, entityAccessor, { oldValue } ).then( change => {
                        if (options && options.changes && options.changes.length >0 )
                        {
                            let nameToMatch = entityAccessor.persistentAlias || entityAccessor.name;
                            let ch = options.changes.find( ch => ch.property == nameToMatch );
                            if (ch)
                            {
                                ch.oldValue = change.oldValue;
                                ch.newValue = change.newValue;
                                ch.property = entityAccessor.name;
                            }
                        }   
                     }));
                });

                Promise.all(promises).then( 
                    () => {
                        if (options && options.changes)
                            baseInstace.instancedChanges = options.changes; 
                        resolve(baseInstace);
                    },
                    error => reject(this.createError(error, 'Error in create instance of a member'))
                );
            }
            else
                resolve(baseInstace);
        });
    }

    getMetadataToExpose(entityName : string) : Array<{ name : string, type : string, persistent : boolean}>
    {
        let info = this.getInfo(entityName);

        return info.getAccessors().filter(accessor => accessor.exposition).map( accessor => { 

            let name = accessor.serializeAlias || accessor.name;
            let type = accessor.activator && accessor.activator.bindingType == MemberBindingType.Reference ? accessor.activator.referenceType : accessor.type;
            let expositionType = accessor.exposition;
            let navigable = accessor.activator ? accessor.activator.extendRoute : false;
            let persistent = (accessor.schema != null || accessor.persistenceType == PersistenceType.Auto );  

            return { 
                name,
                type,
                expositionType, 
                persistent,
                navigable 
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

    listEntities<TEntity extends EMEntity, TDocument extends EntityDocument>(entityName: string) : Promise<ListEntitiesResultDetails<TEntity>>;
    listEntities<TEntity extends EMEntity, TDocument extends EntityDocument>(entityName: string, options : ListOptions ) : Promise<ListEntitiesResultDetails<TEntity>>;
    listEntities<TEntity extends EMEntity, TDocument extends EntityDocument>(entityName: string, options? : ListOptions ) : Promise<ListEntitiesResultDetails<TEntity>>
    {        
        return new Promise<ListEntitiesResultDetails<TEntity>>((resolve, reject)=>{
            this.listDocuments<TDocument>(entityName, options).then(
                results => 
                { 
                    let entities = new Array<TEntity>();
                    let promises = new Array<Promise<void>>();

                    results.docs.forEach( docResult => {
                        promises.push( this.activateEntityInstance<TEntity, TDocument>(this.getInfo(entityName), docResult).then( entity => { entities.push(entity) }));
                    });

                    Promise.all(promises).then(
                        () => resolve({ entities, details: results.details }),
                        error => reject(error) 
                    );
                },
                error => reject(error)
            );
        }); 
    }

    listDocumentsByQuery<TDocument extends EntityDocument>(entityName : string, mongoFilters : any) : Promise<Array<TDocument>>
    {
        return new Promise<Array<TDocument>>( (resolve, reject) => {
            let filters : any = {};
            let ddFilter = { deferredDeletion: { $in: [null, false] } };

            if (mongoFilters instanceof Array)
            {
                if (mongoFilters.length > 0)
                    filters.$and = filters.$and = [ ddFilter, ...mongoFilters ];
                else
                    filters = ddFilter;
            }
            else
            {
                if (mongoFilters)
                    filters.$and = [ ddFilter, mongoFilters ]
                else
                    filters = ddFilter;
            }
                
            this.getModel<TDocument>(entityName).find( filters ).then( 
                docs => resolve(docs), 
                err => reject( this.createError(err, 'Error on list documents'))
            );    
        });
    }

    listEntitiesByQuery<TEntity extends EMEntity, TDocument extends EntityDocument>(info : EntityInfo, mongoFilters : any) : Promise<Array<TEntity>>
    {
        return new Promise<Array<TEntity>>( (resolve, reject) => {
            this.listDocumentsByQuery<TDocument>(info.name, mongoFilters).then(
                docsResult => 
                { 
                    let entities = new Array<TEntity>();
                    let promises = new Array<Promise<void>>();

                    docsResult.forEach( docResult => {
                        promises.push( this.activateEntityInstance<TEntity, TDocument>(info, docResult).then( entity => { entities.push(entity) }));
                    });

                    Promise.all(promises).then(
                        () => resolve(entities),
                        error => reject(error) 
                    );
                }
            );
        }); 
    }


    private _anchoredFiltering : EMSessionFilter | Array<EMSessionFilter>;

    setFiltering( filtering : EMSessionFilter | Array<EMSessionFilter>)
    {
        this._anchoredFiltering = filtering;
    }

    clearFiltering( )
    {
        this._anchoredFiltering = null;
    }

    private createError(error : any, message : string)
    {
        return this._serviceSession.createError(error, message);
    }

    private manageDocumentCreation<TDocument extends EntityDocument>(document : TDocument) : void
    {
        document.created = new Date();
        document.deferredDeletion = false;
        document.createdBy = this._privateUserData.idUser;
    }

    private manageDocumentUpdate<TDocument extends EntityDocument>(document : TDocument) : void
    {
        document.modified = new Date();
        document.modifiedBy = this._privateUserData.idUser;
    }

    private manageDocumentDeletion<TDocument extends EntityDocument>(document : TDocument) : void
    {
        document.deleted = new Date();
        document.deferredDeletion = true;
        document.deletedBy = this._privateUserData.idUser;
    }

    private resolveToMongoFilters(entityName : string, filters? : Array<EMSessionFilter>) : { error : boolean, filters?: any, message? : string }
    {        
        let info : EntityInfo = this.getInfo(entityName);
        
        let persistentMembers = 
                info.getAllMembers()
                    .filter( m => (m instanceof AccessorInfo) && ( m.schema != null || m.persistenceType == PersistenceType.Auto) )
                    .map( m => { 
                        return  { property: m.name, type: m.type, serializeAlias : (m as AccessorInfo).serializeAlias, persistentAlias : (m as AccessorInfo).persistentAlias } 
                    });


        //Base mongo filters
        let mongoFilters : any;
            
        // Convert all the fixed and optional filters in Mongoose Filetrs
        if (filters != null && filters.length > 0)
        {
            mongoFilters = { $and : [ { deferredDeletion: { $in: [null, false] } } ] };  
            // mongoFilters = { $and : [ { deferredDeletion: false } ] };
            
            let opFilters = [];
            let errFilters : string;

            //get all filters
            for (let filter of filters)
            {
                let pMember = persistentMembers.find( pm => pm.property == filter.property || pm.serializeAlias == filter.property || pm.persistentAlias == filter.property);
                if (pMember == null)
                {
                    errFilters = 'Attempt to filter by a non persistent member';
                    break;
                }
                
                //Single mongo filter
                let persistentName = pMember.persistentAlias ? pMember.persistentAlias : pMember.property;
                let mongoFilterConversion = this.parseMongoFilter( filter, pMember.type, persistentName );
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
            mongoFilters = { deferredDeletion: { $in: [null, false] }  };
            // mongoFilters = { deferredDeletion: false };
        }
               
        
        return { error: false, filters: mongoFilters };
    }

    private parseMongoFilter( sessionFilter : EMSessionFilter, propertyType : string, persistentName : string ) : { err : boolean, value?: any, message? : string }
    {           
        //Check and convert the filter value 
        let valueFilter : any; //value to mongo query
        switch(propertyType)
        {
            case 'Number':
                if ( isNaN(sessionFilter.value as any) )
                    return { err: true, message: `The value for a filter in the property "${persistentName}" must be a number` };
                else
                    valueFilter = parseInt(sessionFilter.value);
                break;

            case 'Date':
                let tempTimeStamp = Date.parse(sessionFilter.value);
                if (isNaN(tempTimeStamp) == false) 
                    valueFilter = sessionFilter.value; //new Date(tempTimeStamp); Bug with mongo query
                else
                    return { err: true, message: `The value for a filter in the property "${persistentName}" must be a date` };
                break;

            default:
                valueFilter = sessionFilter.value;
        };

        //Set the table of conversions for filters and mongo filters 
        
        //Value modifiers        
        // let likeModifier = value => { return  '.*' + value + '.*' };
        let likeModifier = value => { return new RegExp(value, "i" );  };

        let configConvesions : Array<{ operators : Array<string>, mongoOperator?: string, filterTypes?: Array<string>, valueModifier? : (v) => any }> =
        [
            { operators: ['=', 'eq'] },
            { operators: ['<>', 'ne'], mongoOperator: '$ne' },
            { operators: ['>=', 'gte'], mongoOperator: '$gte', filterTypes: ['Number', 'Date'],  },
            { operators: ['<=', 'lte'], mongoOperator: '$lte', filterTypes: ['Number', 'Date'] },
            { operators: ['>', 'gt'], mongoOperator: '$gt', filterTypes: ['Number', 'Date'] },
            { operators: ['<', 'lt'], mongoOperator: '$lt', filterTypes: ['Number', 'Date'] },
            { operators: ['lk'], mongoOperator: '$regex', filterTypes: ['String'], valueModifier: likeModifier }
        ];

        //Make the conversion 
        let confIndex = -1;
        
        let conf = configConvesions.find( cc => cc.operators.find( o  => o == sessionFilter.operator) != null);
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
                return { err: true, message: `It is not possible to apply the the operator "${sessionFilter.operator}" to the property "${persistentName}" because it is of type "${propertyType}"` };
        }
        else
            return { err: true, message: `Not valid operator ${sessionFilter.operator} for filtering`};
    }

    private resolveToMongoSorting (entityName : string, sorting? : Array<EMSessionSort>) : { error : boolean, sorting?: any, message? : string }
    {        
        if (sorting != null && sorting.length > 0)
        {
            let info = this.getInfo(entityName);
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

    publishAMQPMessage(eventName : string, data : any) : void
    {
        this._serviceSession.publishAMQPMessage(this, eventName, data);
    }

    publishAMQPAction( methodInfo : MethodInfo, entityId: string, data: any ) : void
    {
        this._serviceSession.publishAMQPAction( this, methodInfo, entityId, data );
    }

    throwException (message : string) : void
    {
        this._serviceSession.throwException( message );
    }
    
    throwInfo(message : string) : void;
    throwInfo(message : string, warnDevMode : boolean) : void;
    throwInfo(message : string, warnDevMode? : boolean) : void
    {
        warnDevMode = warnDevMode != null ? warnDevMode : true;
        this._serviceSession.throwInfo( message, warnDevMode );
    }

    //#endregion



    //#region Accessors (Properties)

    get request ()
    { return this._request; }

    get response()
    { return this._response; }

    get userName()
    { return this._privateUserData.userName; } 

    get systemOwner()
    { return this._privateUserData.systemOwnerSelected; }

    get userCompleteName()
    { return this._privateUserData.name; }

    get serviceSession ()
    { return this._serviceSession; }

    get privateUserData ()
    { return this._privateUserData; }
    
    //#endregion
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

interface ListDocsResultDetails<TDoc extends EntityDocument>
{ 
    docs:  Array<TDoc>,
    details? : { total?: number, skip?: number, take?: number }
}

interface ListEntitiesResultDetails<TEntity extends EMEntity>
{ 
    entities: Array<TEntity>
    details? : { total?: number, skip?: number, take?: number }
}

export { EMSession, EMSessionFilter, FilterType, SortType, EMSessionSort, ListOptions }