//CORE DEPENDENCIES
import mongoose = require('mongoose');
import amqp = require('amqplib/callback_api');
import express = require ('express');
import 'moment';

//CORE FRAMEWORK
import { HcSession } from '../../hc-core/hcSession/hcSession';
import { IMetaDataInfo, EntityInfo, PersistenceType, AccessorInfo, ExpositionType, MemberBindingType, MethodInfo, MemberActivator} from '../../hc-core/hcMetaData/hcMetaData';
import { EMEntity, EntityDocument } from '../emEntity/emEntity';
import { EMServiceSession, EMSessionError } from '../emServiceSession/emServiceSession'; 
import { PrivateUserData } from '../../hc-core/hcUtilities/interactionDataModels';
import { EMEntityMultiKey, EntityKey, IEntityKey, IEntityKeyModel } from '../emEntityMultiKey/emEntityMultiKey';
import moment = require('moment');
import { stringify } from 'querystring';
import { filter } from 'bluebird';
import { EntifixApplicationModule } from '../base-entities/entifix-application-module';
import { EntifixLogger } from '../../app-utilities/logger/entifixLogger';

class EMSession extends HcSession
{
    //#region Properties (Fields)

    private _request : express.Request;
    private _response : express.Response;
    protected _privateUserData : PrivateUserData;
    protected _serviceSession: EMServiceSession;
    
    private _anchoredFiltering : EMSessionFilter | Array<EMSessionFilter>;
        
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

    validateCredentials(userName: string, password : string) : boolean
    {
        return this._privateUserData.userName == userName && this._privateUserData.password == password;
    }
    
    getModel<T extends EntityDocument >(entityName : string) : mongoose.Model<T>
    {       
        let info = this.getInfo( entityName );
        let systemOwner = this.serviceSession.allowFixedSystemOwners && info.fixedSystemOwner ? info.fixedSystemOwner : this._privateUserData.systemOwnerSelected;

        return this._serviceSession.getModel(entityName, systemOwner);
    }

    getUnconstrainedModel<TUnconstrainedModel extends mongoose.Document>(modelName: string) {
        return this.serviceSession.getUnconstrainedModel<TUnconstrainedModel>(this.systemOwner, modelName);
    }

    getInfo(entityName : string ) : EntityInfo
    {
        return this._serviceSession.getInfo(entityName);
    }
         
    createDocument<T extends EntityDocument>(entityName: string, document: T ) : Promise<T>
    {   
        return new Promise<T>((resolve, reject)=>{
            this.manageDocumentCreation(document);
            document
                .save()
                .then(value => resolve(value))
                .catch( exception => reject(this.handleMongoError(exception, 'Exception on document creation')));
        });
    }

    updateDocument<T extends EntityDocument>(entityName: string, document: T ) : Promise<T>
    {   
        return new Promise<T>((resolve, reject)=>{        
            let model = this.getModel<T>(entityName);
            this.manageDocumentUpdate(document);

            document
                .update( document, (error, result) => {
                    if (!error) {
                        model.findById(document._id,(err, doc) =>{
                            if (err)
                                reject( this.createError(err, 'Document updated. It could not be reloaded') );
                            else
                                resolve(doc);   
                        });
                    }
                    else 
                        reject( this.handleMongoError(error, 'Error on document update') );
                }
            );
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
            
            //Result variables
            let inconsistencies : { filtering?, sorting?, message };

            let filters = options && options.filters ? options.filters : [];
            if (this._anchoredFiltering)
            {
                if (this._anchoredFiltering instanceof Array)
                    filters = filters.concat(this._anchoredFiltering);
                else
                    filters.push(this._anchoredFiltering);
            }

            this.resolveToMongoFilters(entityName, filters).then(mongoFilters => {
                let mongoSorting = this.resolveToMongoSorting(entityName, options != null && options.sorting != null ? options.sorting : null);
            
                if (mongoFilters.inconsistencies.length > 0 && (mongoFilters.inconsistencies || (mongoSorting != null && mongoSorting.inconsistencies)))
                {
                    inconsistencies = { message: 'Some query params were ignored because of inconsistency' };
                    if (mongoFilters.inconsistencies)
                        inconsistencies.filtering = mongoFilters.inconsistencies;
                    if (mongoSorting && mongoSorting.inconsistencies)
                        inconsistencies.sorting = mongoSorting.inconsistencies;
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
                            let result : ListDocsResultDetails<T> = { docs: results, details: { total: count } };
                            if (skip > 0 ) 
                                result.details.skip = skip;
                            if (take != null ) 
                                result.details.take = take;
                            if (inconsistencies)
                                result.details.devData = { inconsistencies };

                            resolve( result )
                        }
                        else
                            reject( lastError );                    
                    }                
                };
            });
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

    public instanceDocument<TDocument extends EntityDocument>(info : EntityInfo, persistentData : any) : { document: TDocument, changes : Array<{property:string, oldValue:any, newValue:any}> };
    public instanceDocument<TDocument extends EntityDocument>(info : EntityInfo, persistentData : any, options: { existingDocument?: TDocument } ) : { document: TDocument, changes : Array<{property:string, oldValue:any, newValue:any}> };
    public instanceDocument<TDocument extends EntityDocument>(info : EntityInfo, persistentData : any, options?: { existingDocument?: TDocument } ) : { document: TDocument, changes : Array<{property:string, oldValue:any, newValue:any}> }
    {
        let document : TDocument;
        let changes : Array<{property:string, oldValue:any, newValue:any}>;
        options = options || {};

        let model = this.getModel(info.name);

        if (persistentData) {
            if (options.existingDocument)
                document = options.existingDocument;
            else
                document = new model(persistentData) as TDocument;          
            
            if (options.existingDocument) {
                for ( let p in persistentData) {
                    let oldValue = document[p];
                    let newValue = persistentData[p];
                    
                    if (oldValue != newValue) {
                        if (!changes)
                            changes = [];
                        changes.push( { property: p, oldValue, newValue } );
                    }                                
                }
            }
            
            document.set(persistentData);
        }
        else
            document = new model() as TDocument;
        
        return { document, changes };
    }


    activateEntityInstance<TEntity extends EMEntity, TModel extends EntityDocument>(info: EntityInfo, document : TModel ) : Promise<TEntity>;
    activateEntityInstance<TEntity extends EMEntity, TModel extends EntityDocument>(info: EntityInfo, document : TModel, options : { changes : Array<{ property: string, oldValue : any, newValue: any }> } ) : Promise<TEntity>;
    activateEntityInstance<TEntity extends EMEntity, TModel extends EntityDocument>(info: EntityInfo, document : TModel, options? : { changes : Array<{ property: string, oldValue : any, newValue: any }> } ) : Promise<TEntity>
    {   
        if (document) {
            return new Promise<TEntity>( (resolve, reject) => {
                let changes = options && options.changes ? options.changes : [];
                let baseInstace = this._serviceSession.entitiesInfo.find(a => a.name == info.name).activateType(this, document);
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
        else    
            return Promise.resolve(null);
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
                    filters.$and = [ ddFilter, ...mongoFilters ];
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

    findEntityByKey<TEntity extends EMEntityMultiKey, TDocument extends EntityDocument>(info : EntityInfo, key : IEntityKey ) : Promise<TEntity>
    {
        return new Promise<TEntity>( (resolve,reject) => {
            this.findDocumentByKey<TDocument>(info, key).then(
                doc => {
                    if (doc) 
                        this.activateEntityInstance<TEntity, TDocument>(info, doc).then( entity => resolve(entity)).catch(reject);
                    else
                        resolve(null);
                }
            ).catch(reject);
        });
    }

    findDocumentByKey<TDocument extends EntityDocument>(info : EntityInfo, key : IEntityKey) : Promise<TDocument>
    {
        return new Promise<TDocument>( (resolve,reject) => {
            let matchFiler = {
                alternativeKeys: {
                    $elemMatch: {
                        serviceName: { '$regex': new RegExp(["^", key.serviceName, "$"].join(""), "i") },
                        entityName: { '$regex': new RegExp(["^", key.entityName, "$"].join(""), "i") },
                        value: key.value                        
                    }
                }
            };            
    
            this.listDocumentsByQuery<TDocument>( info.name, matchFiler ).then( 
                docs => {
                    if (docs.length > 0)
                        resolve(docs[0]);
                    else
                        resolve(null);
                } 
            ).catch( err => reject( this.createError( err, 'Error on retrive Document Multikey')) );
        });
    }

    setFiltering( filtering : EMSessionFilter | Array<EMSessionFilter>)
    {
        this._anchoredFiltering = filtering;
    }

    clearFiltering( )
    {
        this._anchoredFiltering = null;
    }

    setSharedCacheData(key : string, data : any) : Promise<void>;
    setSharedCacheData(key : string, data : any, options : { expirationSeconds? : number }) : Promise<void>;
    setSharedCacheData(key : string, data : any, options? : { expirationSeconds? : number }) : Promise<void> 
    {
        if (!key || !data)
            return Promise.reject(this.createError(null, 'The parameters key and value are required to set shared cache data'));

        if (!this.serviceSession || !this.serviceSession.authCacheClient)
            return Promise.reject(this.createError(null, 'No cache client instanced'));

        return new Promise<void>((resolve, reject) => {
            let completeKey = 'cacheVar:' + this.privateUserData.sessionKey + '_' + key.trim();
            let cacheClient = this.serviceSession.authCacheClient;
            let expiration = options != null && options.expirationSeconds != null ? options.expirationSeconds : 10;

            let stringWrappedData = JSON.stringify({ data });

            cacheClient.setex(completeKey, expiration, stringWrappedData, err => {
                if (!err) 
                    resolve();
                else
                    reject(this.createError(err, 'Error on create shared cache data'));
            });
        });
    }

    getSharedCacheValue(key : string) : Promise<any> 
    {
        if (!key)
            return Promise.reject(this.createError(null, 'The parameters key is required to get shared cache data'));

        return new Promise<void>((resolve,reject) => {
            let completeKey = 'cacheVar:' + this.privateUserData.sessionKey + '_' + key.trim();
            
            this.serviceSession.authCacheClient.get(completeKey, (err, result) => {
                if (!err) {
                    if (!result) 
                        resolve( JSON.parse(result) );
                    else
                        resolve();
                }
                else
                    reject(this.createError(err, 'Error on retrieve cache value'))
            });
        });
    }


    private createError(error : any, message : string)
    {
        return this._serviceSession.createError(error, message);
    }

    private handleMongoError(exception : any, message : string) : EMSessionError
    {
        let error : EMSessionError;
        if (exception && exception.name == 'ValidationError') {
            error = new EMSessionError(exception, message);
            error.setAsHandled(400, {
                cause: 'Data validations uncompleted', 
                helper: 'Mongo ValidationError - ' + exception.message, 
                includeDetails: false 
            })
            return error;
        }
        else
            return this.createError(exception, message);
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

    private resolveToMongoFilters(entityName : string, filters? : Array<EMSessionFilter>) : Promise<FiltersConversion>
    {        
        return new Promise<FiltersConversion>( (resolve, reject) => { 
       
            let info : EntityInfo = this.getInfo(entityName);
            let inconsistencies : Array<{property:string, message:string}>;
            let opFilters = [];
            let addInconsistency = ( i : {property:string, message:string}) => { 
                if (!inconsistencies)
                    inconsistencies = new Array<{property:string, message:string}>();
                inconsistencies.push(i);
            };        

            let complexFiltersAsync = (complexFilters) => {
                return new Promise<FiltersConversion>( (resolve, reject) => { 
                    let entityFilters = new Array<{entity: string, filters: any, property: string, filterType: FilterType}>();
                    info.getAccessors()
                        .filter(a => a.activator instanceof MemberActivator)
                        .forEach(a => {
                            let eFilters = complexFilters.filter(f => (f.complexFilter == true) && ( a.name == f.parentProperty));
                                                                        
                            if(eFilters.length > 0)
                                entityFilters
                                    .push({
                                        entity: a.type, 
                                        filters: eFilters.map(mf => { mf.complexFilter = null; return mf }), 
                                        property: a.persistentAlias ? a.persistentAlias : a.name,
                                        filterType: eFilters[0].filterType
                                    });
                                                        
                        });

                    let entityMongoFiltersPromises = entityFilters.map(ef => 
                         this.resolveToMongoFilters(ef.entity, ef.filters).then( filtersConversion => {
                             return {
                                 entity: ef.entity,
                                 filtersConversion,
                                 property: ef.property,
                                 filterType: ef.filterType
                             }
                         })
                    );

                    Promise.all(entityMongoFiltersPromises).then( complexEntitiesFilters => {
                        let asynkTasks = complexEntitiesFilters.map(emf => {
                            return new Promise<{property: string, values: string[], filterType: FilterType}>( (resolve, reject) => {
                                this.getModel(emf.entity).find(emf.filtersConversion.filters).select('_id').exec((err, res) => {
                                    if(!err)
                                    {
                                        let tempRes = <string[]> (res.map(r => r.id) as any) ;
                                        resolve({property: emf.property, values: tempRes, filterType: emf.filterType})
                                    }
                                    else
                                        reject(err);
                                });
                            });
                        });

                        filters = filters.filter(f => f.complexFilter == false);
    
                        Promise.all(asynkTasks).then(results => {
                            let finalFilter = { $and : [] , $or : []}; 
                            let values = results.forEach (v => {
                                let arrayValues = v.values;
                                if (!arrayValues || arrayValues.length == 0)
                                    arrayValues = ['always', 'false']; // Custom values to set always false for this filter

                                if(v.filterType == FilterType.Fixed)
                                    finalFilter.$and.push({[v.property]: {$in: arrayValues }});
                                else if(v.filterType == FilterType.Optional)
                                    finalFilter.$or.push({[v.property]: {$in: arrayValues}});
                                
                                return finalFilter
                            });
                            resolve({filters: finalFilter})
                        }).catch(e => this.createError(e, "Error on complex filters"));
                    }).catch(e => this.createError(e, "Error on complex filters"));
                });               
            };
          
            let simpleFiltersAsync = (simpleFilters) => {
                return new Promise<FiltersConversion>( (resolve, reject) => { 
                    //Base mongo filters
                    let mongoFilters : any;
                    let persistentMembers = 
                    info.getAllMembers()
                        .filter( m => (m instanceof AccessorInfo) && ( m.schema != null || m.persistenceType == PersistenceType.Auto) )
                        .map( m => { return  { property: m.name, type: m.type, serializeAlias : (m as AccessorInfo).serializeAlias, persistentAlias : (m as AccessorInfo).persistentAlias } });

                    // Convert all the fixed and optional filters in Mongoose Filetrs       
                    if (simpleFilters != null &&  simpleFilters.length > 0)
                    {
                        mongoFilters = { $and : [] };  

                        //get all filters 
                        for (let filter of simpleFilters)
                        {
                            let pMember = persistentMembers.find( pm => pm.property == filter.property || pm.serializeAlias == filter.property || pm.persistentAlias == filter.property);
                            if (pMember)
                            {
                                let persistentName = pMember.persistentAlias ? pMember.persistentAlias : pMember.property;
                                let mongoFilterConversion = this.parseMongoFilter( filter, pMember.type, persistentName );
                                if ( !mongoFilterConversion.err)
                                {   
                                    if (filter.filterType == FilterType.Fixed)
                                        mongoFilters.$and.push( mongoFilterConversion.value );   
                                
                                    if (filter.filterType == FilterType.Optional)
                                        opFilters.push( mongoFilterConversion.value );
                                }
                                else
                                    addInconsistency({ property: filter.property, message: mongoFilterConversion.message });
                            }
                            else
                                addInconsistency({ property: filter.property, message: 'Attempt to filter by a non persistent member' });
                        }

                        if( opFilters.length > 0)
                        {
                            mongoFilters.$and.push( { $or: opFilters });
                        } 
                    }                        
                    resolve({ filters: mongoFilters, inconsistencies });
                });
            }; 

            let filterConcatenation = (resultsArray) => {
                let finalFilter;
                let finalInconsistencies = new Array();
                resultsArray.forEach(r => {
                    if (r.filters && r.filters.$and && r.filters.$and.length > 0) {
                        if (r.inconsistencies) {
                            finalInconsistencies = r.inconsistencies;
                        }
                        if (!finalFilter)
                            finalFilter = { $and: [] };
                        finalFilter.$and = finalFilter.$and.concat(r.filters.$and);
                    }
                    if (r.filters instanceof Array && r.filters.length > 0) {
                        r.filters.forEach(cf => {
                            if (cf.inconsistencies) {
                                finalInconsistencies = cf.inconsistencies;
                            }
                            if (!finalFilter)
                                finalFilter = { $and: [] };
                            if (cf.$or && cf.$or.length > 0) {
                                if (finalFilter.$and.filter(e => e.$or).length > 0)
                                    finalFilter.$and.filter(e => e.$or).forEach(e => e.$or = e.$or.concat(cf.$or));
                                else
                                    finalFilter.$and.push({ $or: cf.$or });
                            }
                            if (cf.$and && cf.$and.length > 0) {
                                finalFilter.$and = finalFilter.$and.concat(cf.$and);
                            }
                        });
                    }
                });
                if (finalFilter && finalFilter.$and.filter(e => e.$or).length > 1) {
                    let orArrays = [];
                    let orsToRemove = [];
                    finalFilter.$and.filter(e => e.$or).forEach(e => { orArrays = orArrays.concat(e.$or); orsToRemove.push(e); });
                    for (let o of orsToRemove) {
                        let index = finalFilter.$and.indexOf(o);
                        finalFilter.$and.splice(index, 1);
                    }
                    finalFilter.$and.push({ $or: orArrays });
                }
                if (finalFilter && finalFilter.$and)
                    finalFilter.$and.push({ deferredDeletion: { $in: [null, false] } });
                else
                    finalFilter = { deferredDeletion: { $in: [null, false] } };
                resolve({ filters: finalFilter, inconsistencies: finalInconsistencies });
            }; 
            
            let mainResults = new Array<FiltersConversion>();

            if(filters.filter(f => (f.complexFilter == true)).length > 0)
                complexFiltersAsync(filters.filter(f => (f.complexFilter == true)))
                    .then(complexResult => {
                            mainResults.push(complexResult);
                            simpleFiltersAsync(filters.filter(f => (f.complexFilter == false || f.complexFilter == null)))
                                .then(simpleResult => {
                                    mainResults.push(simpleResult);
                                    filterConcatenation(mainResults);
                                })
                                .catch(e => reject(this.createError(e, "emSession: Error processing mongo filters conversion")));
                        })
                    .catch(e => reject(this.createError(e, "emSession: Error processing mongo filters conversion")));
            else
                simpleFiltersAsync(filters.filter(f => (f.complexFilter == false || f.complexFilter == null)))
                    .then(simpleResults => { 
                            mainResults.push(simpleResults);
                            filterConcatenation(mainResults);
                        })
                    .catch(e => reject(this.createError(e, "emSession: Error processing mongo filters conversion")));
            
        });
    }

    private parseMongoFilter( sessionFilter : EMSessionFilter, propertyType : string, persistentName : string ) : { err : boolean, value?: any, message? : string }
    {           
        //Check and convert the filter value 
        let valueFilter : any; //value to mongo query
        
        //Format or adjust filter value
        switch(propertyType)
        {
            case 'Number':
                if ( isNaN(sessionFilter.value as any) )
                    return { err: true, message: `The value for a filter in the property "${persistentName}" must be a number` };
                else
                    valueFilter = parseInt(sessionFilter.value);
                break;

            case 'Date':
                if (sessionFilter.operator == 'lk')
                {
                    let dateFiltering = this.checkPossibleDate(sessionFilter.value);
                    if(!dateFiltering.error)
                        valueFilter = { $gte: dateFiltering.minDate.toISOString(), $lt: dateFiltering.maxDate.toISOString() };    
                    else
                        return { err: true, message: `The value for a filter in the property [${persistentName}] must be a date` };        
                }
                else
                {
                    let tempTimeStamp = Date.parse(sessionFilter.value);
                    if (isNaN(tempTimeStamp) == false) 
                    { 
                        // valueFilter = sessionFilter.value; //new Date(tempTimeStamp); Bug with mongo query
                        valueFilter = new Date(sessionFilter.value).toISOString();
                    }
                    else
                        return { err: true, message: `The value for a filter in the property [${persistentName}] must be a date` };
                }

                break;

            case 'String':
                if (sessionFilter.operator == 'lk')
                    valueFilter = { '$regex': new RegExp( sessionFilter.value, "i" ) };
                else
                    valueFilter = sessionFilter.value;
                
                break;
                
            default:
                valueFilter = sessionFilter.value;
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
            { operators: ['lk'], filterTypes: ['String', 'Date'] }
        ];

        //Make the conversion         
        let conf = configConvesions.find( cc => cc.operators.find( o  => o == sessionFilter.operator) != null);
        if (conf != null)
        {
            if ( conf.filterTypes == null || ( conf.filterTypes != null && conf.filterTypes.find( at => at == propertyType ) != null) ) 
            {
                let value : any;

                if (conf.mongoOperator)
                    value = { [persistentName] : { [conf.mongoOperator ] : valueFilter} }; // valueFilter sera un array y el operador un '$in'
                else
                    value = { [persistentName] : valueFilter };
                    
                return { err: false, value };
            }                
            else
                return { err: true, message: `It is not possible to apply the the operator [${sessionFilter.operator}] to the property [${persistentName}] because it is of type "${propertyType}"` };
        }
        else
            return { err: true, message: `Not valid operator ${sessionFilter.operator} for filtering`};
    }

    private resolveToMongoSorting (entityName : string, sorting? : Array<EMSessionSort>) : { sorting?: any, inconsistencies? : Array<{property:string, message:string}> }
    {        
        if (sorting != null && sorting.length > 0)
        {
            let info = this.getInfo(entityName);
            let persistentMembers = info.getAllMembers().filter( m => (m instanceof AccessorInfo) && m.schema != null ).map( m => { return  { property: m.name, type: m.type } } );
            let inconsistencies : Array<{property:string, message:string}>;
            let addInconsistency = ( i : {property:string, message:string}) => { 
                if (!inconsistencies)
                    inconsistencies = new Array<{property:string, message:string}>();
                inconsistencies.push(i);
            };

            let mongoSorting : any = {};

            for (let sort of sorting)
            {
                let pMember = persistentMembers.find( pm => pm.property == sort.property);
                if (pMember)
                {
                    let mst : string;
                    if (sort.sortType == SortType.ascending)
                        mst = 'asc';
                    if (sort.sortType == SortType.descending)
                        mst = 'desc'

                    mongoSorting[sort.property] = mst; 
                }
                else
                    addInconsistency({property:sort.property, message:'Attempt to sort by a non persistent member'});
            }

            return { sorting: mongoSorting, inconsistencies };
        }
        else
            return null;        
    }

    private checkPossibleDate(possibleDate : string) : { error: boolean, minDate?: Date, maxDate?: Date }
    {
        let separators = ['-','/','.'];
        let dateArrayString = new Array<string>();
        let dateArrayNumber : Array<number>;

        separators.forEach( s => {
            let pa = possibleDate.split(s);
            if (pa.length > dateArrayString.length)
                dateArrayString = pa;
        });

        if (dateArrayString.filter(e => isNaN(e as any)).length > 0)
            return { error: true };

        dateArrayNumber = dateArrayString.map( e => parseInt(e) );
            
        if (dateArrayNumber.filter(e => e < 0).length > 0)
            return { error: true };

        if (dateArrayNumber.length > 0 && dateArrayNumber.length <= 3)
        {
            let year : number, month : number, day : number;
            
            switch( dateArrayNumber.length )
            {
                case 3:
                    if (dateArrayNumber[0] > 31)
                    {
                        year = dateArrayNumber[0];
                        month = dateArrayNumber[1];
                        day = dateArrayNumber[2];
                    }
                    else
                    {
                        year = dateArrayNumber[2];
                        month = dateArrayNumber[1];
                        day = dateArrayNumber[0];
                    }

                    break;

                case 2:
                    if (dateArrayNumber[0] > 12)
                    {
                        year = dateArrayNumber[0];
                        month = dateArrayNumber[1];
                    }
                    else
                    {
                        year = dateArrayNumber[1];
                        month = dateArrayNumber[0];
                    }

                    break;

                case 1:
                    year = dateArrayNumber[0];
                    break;
            };

            if (year < 100)
                year += 2000;

            if (month > 12)
                return { error: true };

            let minMonth:number, maxMonth:number, minDay:number, maxDay:number;
            let minDate:Date, maxDate:Date;
             
            if (!month)
            {
                minMonth = 1;
                maxMonth = 12;
            }
            else
                minMonth = maxMonth = month;

            if (!day)
            {
                minDate = new Date( year, minMonth-1, 1);
                maxDate = moment(new Date( year, maxMonth-1, 1)).add(1, 'month').toDate();
            }
            else
            {
                minDate = new Date( year, minMonth-1, day );
                maxDate = new Date( year, maxMonth-1, day );
            }

            if ( !isNaN(minDate.valueOf()) && !isNaN(maxDate.valueOf()) )
                return { error: false, minDate, maxDate };
            else    
                return { error: true };
        }
        else
            return { error: true };
    }

    publishAMQPMessage(eventName : string, data : any) : Promise<void>
    {
        return this._serviceSession.publishAMQPMessage(this, eventName, data);
    }

    publishAMQPAction( methodInfo : MethodInfo, entityId: string, data: any ) : Promise<void> 
    {
        return this._serviceSession.publishAMQPAction( this, methodInfo, entityId, data );
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
    complexFilter: boolean,
    parentProperty: string,
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
    sorting? : Array<EMSessionSort>
}

interface ListDocsResultDetails<TDoc extends EntityDocument>
{ 
    docs:  Array<TDoc>,
    details? : { total?: number, skip?: number, take?: number, devData? : any }
}

interface ListEntitiesResultDetails<TEntity extends EMEntity>
{ 
    entities: Array<TEntity>
    details? : { total?: number, skip?: number, take?: number, devData? : any }
}

interface FiltersConversion
{
    filters?: any;
    inconsistencies? : Array<{property:string, message:string}>;
    filterType?: FilterType;
}

export { EMSession, EMSessionFilter, FilterType, SortType, EMSessionSort, ListOptions, FiltersConversion }