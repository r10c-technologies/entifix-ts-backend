import mongoose = require('mongoose');

import { Entity, EntityMovementFlow } from '../../hc-core/hcEntity/hcEntity';
import { EMSession } from '../emSession/emSession';
import { DefinedAccessor, DefinedEntity, PersistenceType, EntityInfo, ExpositionType, MemberBindingType } from '../../hc-core/hcMetaData/hcMetaData';
import { EntityEventLogType } from '../../amqp-events/amqp-entity-logger/AMQPEntityLogger';
import { getEntityOperationMetadata, EMEntityMetaOperationType } from '../../extensibility/';
import { EntifixLogger } from '../../app-utilities/logger/entifixLogger';

interface IBaseEntity
{
    created : Date,
    modified? : Date,
    deleted? : Date,
    deferredDeletion?: Boolean,
    createdBy : string,
    modifiedBy? : string,
    deletedBy? : string
}

interface EntityDocument extends mongoose.Document, IBaseEntity { }

@DefinedEntity( { packageName: 'CORE', abstract: true })
class EMEntity extends Entity
{
    //#region Properties

    protected _document : EntityDocument;
    private _session : EMSession;
    
    private _instancedChanges : Array<{property: string, oldValue: any, newValue: any}>;

    //#endregion


    //#region Methods

    constructor (session: EMSession);
    constructor (session: EMSession, document : EntityDocument);
    constructor (session: EMSession, document? : EntityDocument)
    {
        super();
        
        this._session = session;
        
        if (!document)
        {
            let model = this.session.getModel(this.entityInfo.name);
            this._document = new model();
        } 
        else
            this._document = document;
    }

    serializeExposedAccessors () : any
    {
        var simpleObject : any = {};
        
        this.entityInfo
            .getAccessors()
            .filter( accessor => accessor.exposition )
            .forEach( accessor => {
                let nameSerialized = accessor.serializeAlias || accessor.name;
                if ( accessor.activator != null && this[accessor.name] != null) {
                    if (accessor.activator.includeDuringSerialization) {
                        switch(accessor.activator.includeDuringSerialization) {
                            case 'completeEntity':
                                if (accessor.type == "Array") 
                                    simpleObject[nameSerialized] = ( this[accessor.name] as Array<EMEntity>).map( e =>  e.serializeExposedAccessors()); 
                                else
                                    simpleObject[nameSerialized] = ( this[accessor.name] as EMEntity ).serializeExposedAccessors();
                                break;
                            /**
                             * Add more cases
                             */
                            default: 
                                if (accessor.type == "Array") {
                                    simpleObject[nameSerialized] = ( this[accessor.name] as Array<EMEntity>).map( e =>  e._id); 
                                }
                                else {
                                    simpleObject[nameSerialized] = ( this[accessor.name] as EMEntity )._id;
                                    let defaultAccessor = accessor.activator.defaultAccessor;
                                    if (defaultAccessor)
                                        simpleObject['$'+accessor.name] = this[accessor.name][defaultAccessor];
                                }
                        }
                    }
                }
                else
                    simpleObject[nameSerialized] = this[accessor.name];
        });

        return simpleObject;
    }

    save(): Promise<EntityMovementFlow> 
    {
        return new Promise<EntityMovementFlow>((resolve, reject) =>
            this.onSaving()
                .then(movFlow => {
                    if (movFlow.continue)
                        this.performExtensionOperators(EMEntityMetaOperationType.BeforeSave)
                            .then(extensionMovFlow => {
                                if (extensionMovFlow.continue) {
                                    this.syncActibableAccessors(this);
                                    if (this._document.isNew)
                                        this._session
                                            .createDocument(this.entityInfo.name, this._document)
                                            .then(documentCreated => {
                                                    this._document = documentCreated;
                                                    this.logTrace(`Created entity [${this.entityInfo.name}(${this._document._id.toString()})]`, 'save');
                                                    this.afterSaveEntity(true).then(result => resolve(result)).catch(reject);
                                                })
                                            .catch(exception => {
                                                    this.logWarn(`Caught exception on create entity [${this.entityInfo.name}]-${exception && exception.message ? exception.message : exception.toString()}`, 'save');
                                                    this.performExtensionOperators(EMEntityMetaOperationType.OnSaveException, { exception })
                                                        .then(() => reject(exception))
                                                        .catch(() => reject(exception))
                                                });
                                    else
                                        this._session
                                            .updateDocument(this.entityInfo.name, this._document)
                                            .then(documentUpdated => {
                                                    this._document = documentUpdated;
                                                    this.logTrace(`Updated entity [${this.entityInfo.name}(${this._document._id.toString()})]`, 'save');
                                                    this.afterSaveEntity(false)
                                                        .then(result => resolve(result))
                                                        .catch(reject);
                                                })
                                            .catch(exception => {
                                                    this.logWarn(`Caught exception on update entity [${this.entityInfo.name}]-${exception && exception.message ? exception.message : exception.toString()}`, 'save');
                                                    this.performExtensionOperators(EMEntityMetaOperationType.OnSaveException, { exception })
                                                        .then(() => reject(exception))
                                                        .catch(() => reject(exception))
                                                });
                                }
                                else
                                    resolve(extensionMovFlow);
                            })
                            .catch(reject);
                    else
                        resolve(movFlow);
                })
                .catch(reject)
        );
    }

    private afterSaveEntity( newEntity : boolean ) : Promise<EntityMovementFlow> 
    {
        return new Promise<EntityMovementFlow>((resolve,reject)=>{

            let amqpTriggerType : EntityEventLogType;

            if (newEntity)
                amqpTriggerType = EntityEventLogType.created;
            else
                amqpTriggerType = EntityEventLogType.updated;

            // The extension operaion in the future must include the AMQP Triggers 
            this.performExtensionOperators(EMEntityMetaOperationType.AfterSave).then( opResult => {    
                if (opResult.continue) {
                    this.triggerAMQP(amqpTriggerType);
                    let asynkTask = this.onSaved();
                    if (asynkTask)
                        asynkTask.then( ()=> resolve(opResult)).catch( () => resolve(opResult)); // OnSaved actions cannot stop transaction
                    else
                        resolve(opResult);
                }
                else
                    resolve(opResult)
            }).catch(reject);
        });
    }
    
    private performExtensionOperators(operationType : EMEntityMetaOperationType | Array<EMEntityMetaOperationType>, additionalData? : any ) : Promise<EntityMovementFlow>
    {
        return new Promise((resolve,reject)=> {
            let entityOperators = getEntityOperationMetadata(this);

            if (entityOperators && entityOperators.length > 0) 
                entityOperators = entityOperators.filter( eo => eo.applyForOperation(operationType) );
                
            if (entityOperators && entityOperators.length > 0) {
                // Exectuion of operations
                let allResults = entityOperators.map( eo => eo.perform(this, additionalData) );
            
                let syncResults  = allResults.filter( eo => !(eo instanceof Promise)) as Array<void | EntityMovementFlow>;

                if (syncResults && syncResults.length > 0)
                    syncResults = syncResults.map(eo => {
                        if ((eo as EntityMovementFlow).continue != null)
                            return eo as EntityMovementFlow;
                        else
                            return null;
                    });
                else
                    syncResults = [];

                let asyncResults = allResults.filter( eo => eo instanceof Promise) as Array<Promise<void | EntityMovementFlow>>;
                if (asyncResults && asyncResults.length > 0)
                    Promise.all(asyncResults).then( r => resolvePromise(syncResults.concat(r)) ).catch( reject );
                else
                    resolvePromise(syncResults);

                var resolvePromise = (results : Array<void | EntityMovementFlow>) => 
                {    
                    let affectResults = results.filter( r => r != null) as Array<EntityMovementFlow>;
                    if (affectResults && affectResults.length > 0 ){
                        let concatMessages = (prev : string, curr : string) =>  curr != null ? (prev || '') + ' - ' + curr : prev;
                        let finalEMF = affectResults.reduce( (prev, curr) => { return {continue: prev.continue && curr.continue, message: concatMessages(prev.message, curr.message)}; }, { continue: true } );
                        resolve( finalEMF );
                    }
                    else
                        resolve({continue: true});
                };
            }
            else
                resolve({ continue: true })
        });
    }




    delete () : Promise<EntityMovementFlow>
    {
        return new Promise<EntityMovementFlow>( (resolve, reject) => {

            this.onDeleting().then(
                movFlow => 
                {
                    if (movFlow.continue) {
                        let idToDelete = this._id.toString();
                        this.session.deleteDocument(this.entityInfo.name, this._document).then( 
                            ()=> { 
                                this.onDeleted(); 
                                this.triggerAMQP(EntityEventLogType.deleted);
                                this.logTrace(`Deleted entity [${this.entityInfo.name}(${idToDelete})]`, 'delete');
                                resolve({continue:true}); 
                            },
                            error => reject(error)
                        );
                    }
                    else
                        resolve(movFlow);
                }, 
                reject // Reject passed
            );
        });
    }

    protected onSaving() : Promise<EntityMovementFlow>
    {
        return Promise.resolve({continue: true});
    }

    protected onDeleting() : Promise<EntityMovementFlow>
    {
        return Promise.resolve({continue: true});
    }

    protected onSaved() : void | Promise<void>
    {
        return null;
    }

    protected onDeleted() : void | Promise<void>
    {
        return null;
    }

    static getSchema() : any
    {
        return this.prototype.entityInfo.getCompleteSchema();
    }

    getDocument() : EntityDocument
    {
        return this._document;
    }

    equals( otherEntity : Entity ) : boolean
    {
        if (otherEntity instanceof EMEntity)
            return this._id.toString() == (otherEntity as EMEntity)._id.toString();
        else 
            return false;
    }

    private triggerAMQP( entityEventType : EntityEventLogType ) : void
    {
        new Promise<void>((resolve, reject) => {
            let eventManager = this.session.serviceSession.amqpEventManager;
            if (eventManager != null && eventManager.hasEntityLogger(this.entityInfo)) 
                eventManager.triggerEntityLogger( this, entityEventType);
        }).then( () => {
            //*** Pending manage post actions */
        }).catch( () => { 
            //*** Pending manage retry dynamic */
        });            
    }
    
    private syncActibableAccessors( entity : EMEntity ) : void
    {
        for (let accesor of entity.entityInfo.getAccessors()) {
            if (accesor.activator && entity[accesor.name]) {
                let value = entity[accesor.name];

                if (value instanceof Array) 
                    value.forEach( value => {
                        if (value instanceof EMEntity)
                            this.syncActibableAccessors(value);
                    });
                else if (value instanceof EMEntity) 
                    this.syncActibableAccessors(value);
                
                // set the members again to update the document inside
                entity[accesor.name] = entity[accesor.name]; 
            }
        }
    }

    private logTrace(message: string, method: string) : void
    {
        EntifixLogger.trace({
            message,
            user: this.session.privateUserData.userName,
            systemOwner: this.session.privateUserData.systemOwnerSelected,
            origin: { file: 'emEntity', class: 'EMEntity', method},
            developer: 'herber230'
        });
    }

    private logError(message: string, method: string) : void
    {
        EntifixLogger.error({
            message,
            user: this.session.privateUserData.userName,
            systemOwner: this.session.privateUserData.systemOwnerSelected,
            origin: { file: 'emEntity', class: 'EMEntity', method},
            developer: 'herber230'
        });
    }

    private logWarn(message: string, method: string) : void
    {
        EntifixLogger.warn({
            message,
            user: this.session.privateUserData.userName,
            systemOwner: this.session.privateUserData.systemOwnerSelected,
            origin: { file: 'emEntity', class: 'EMEntity', method},
            developer: 'herber230'
        });
    }


    //#endregion


    //#region Accessors

    get session ()
    { return this._session };

    @DefinedAccessor({ exposition: ExpositionType.ReadOnly, schema : { type: Date, require: true } })
    get created () : Date
    { return this._document.created; }
    set created (value : Date)
    { this._document.created = value; }

    @DefinedAccessor({ exposition: ExpositionType.ReadOnly, schema : {  type: Date, require: false } })
    get modified () : Date
    { return this._document.modified; }
    set modified (value : Date)
    { this._document.modified = value; }

    @DefinedAccessor({ schema : {  type: Date, require: false } })
    get deleted () : Date
    { return this._document.deleted; }
    set deleted (value : Date)
    { this._document.deleted = value; }

    @DefinedAccessor({ exposition: ExpositionType.System, persistenceType: PersistenceType.Auto, serializeAlias: 'id', display: "Id" })
    get _id () : any
    { return this._document ? this._document._id : null; }

    @DefinedAccessor({ exposition: ExpositionType.System, persistenceType: PersistenceType.Auto, serializeAlias: 'v', display: "Version" })
    get __v () : number
    { return this._document.__v; }

    @DefinedAccessor({ schema : { type: Boolean, require: true } })
    get deferredDeletion() : Boolean
    { return this._document.deferredDeletion; }
    set deferredDeletion( value : Boolean )
    { this.deferredDeletion = value; }

    get instancedChanges() 
    { 
        if (!this._instancedChanges)
            this._instancedChanges = [];
        return this._instancedChanges; 
    }
    set instancedChanges(value)
    { this._instancedChanges = value; }

    get isNew()
    { return this._document.isNew; }

    @DefinedAccessor({exposition: ExpositionType.System, persistenceType: PersistenceType.Defined})
    get key()
    { return { serviceName: this._session.serviceSession.serviceName, entityName: this.entityInfo.name, value: this._id.toString() }; }

    @DefinedAccessor({ exposition: ExpositionType.ReadOnly, schema : {  type: String, require: false } })
    get createdBy () : string
    { return this._document.createdBy; }
    
    @DefinedAccessor({ exposition: ExpositionType.ReadOnly, schema : {  type: String, require: false } })
    get modifiedBy () : string
    { return this._document.modifiedBy; }
    
    @DefinedAccessor({ exposition: ExpositionType.ReadOnly, schema : {  type: String, require: false } })
    get deletedBy () : string
    { return this._document.deletedBy; }
    
    //#endregion


    //#region Static

    static deserializeAccessors (info : EntityInfo, simpleObject : any) : { persistent? : any, nonPersistent? : any, readOnly? : any, nonValid? : any, ownArrayController? : any }
    {
        let persistent : any;
        let nonPersistent : any;
        let readOnly : any;
        let ownArrayController : any;

        /**
         * Main dynamic to select attributes to extract
         */
        info.getAccessors().filter( accessor => accessor.exposition ).forEach( accessor => {

            let exposedName = accessor.serializeAlias || accessor.name;
            let persistentName = accessor.persistentAlias || accessor.name;

            if (accessor.exposition == ExpositionType.Normal || accessor.exposition == ExpositionType.System)
            {
                let isPersistent = accessor.schema != null || accessor.persistenceType == PersistenceType.Auto;
                if (isPersistent) {
                    if ((simpleObject as Object).hasOwnProperty(exposedName)) {
                        if (!persistent) 
                            persistent = {};

                        if (accessor.activator) {
                            if (accessor.activator.considerDuringDeserialization) 
                                persistent[persistentName] = simpleObject[exposedName];    
                            else {
                                if (!ownArrayController) ownArrayController = {};
                                ownArrayController[persistentName] = simpleObject[exposedName];
                            }                            
                        }
                        else  
                            persistent[persistentName] = simpleObject[exposedName];
                    }
                }
                else
                {
                    if ((simpleObject as Object).hasOwnProperty(exposedName))
                    {
                        if (!nonPersistent) nonPersistent = {};
                        nonPersistent[exposedName] = simpleObject[exposedName];
                    }
                }
            }
            if (accessor.exposition == ExpositionType.ReadOnly)
            {
                if ((simpleObject as Object).hasOwnProperty(exposedName))
                {
                    if (!readOnly) readOnly = {};
                    readOnly[exposedName] = simpleObject[exposedName];
                }                
            }

            delete simpleObject[exposedName];
        });

        /**
         * Excluding attributes that are nonPersistent by convention (Start with '$')
         */
        if (Object.keys(simpleObject).length > 0)
            for (let p in simpleObject) 
                if (p && p.length > 0 && p[0] == '$') {
                    if (!nonPersistent)
                        nonPersistent = {};
                    nonPersistent[p] = simpleObject[p];
                    delete simpleObject[p];
                }

        /**
         * Non valid attributes
         */
        let nonValid = Object.keys(simpleObject).length > 0 ? simpleObject : null;
        
        return { persistent, nonPersistent, readOnly, nonValid, ownArrayController };
    }

    static serializeComplexObject(complexObject : any ) : any
    {
        if (!complexObject)
            return null;

        if (complexObject instanceof EMEntity)
            return complexObject.serializeExposedAccessors();

        let serializeObject = object => {
            let serializedResult : any;
            let setPropertyValue = (pName: string, pValue : any) =>  {
                if (!serializedResult)
                    serializedResult = {};
                serializedResult[pName] = pValue;
            };

            for (let propertyName in object) 
                if (object[propertyName]) {
                    let propertyValue = object[propertyName];

                    if (propertyValue instanceof EMEntity) 
                        setPropertyValue(propertyName, propertyValue.serializeExposedAccessors());
                    else if (propertyValue instanceof Array)
                        setPropertyValue(propertyName, propertyValue.map(element => serializeObject(element)));
                    else if (typeof propertyValue == 'object')
                        setPropertyValue(propertyName, serializeObject(propertyValue))
                    else
                        setPropertyValue(propertyName, propertyValue); 
                }

            return serializedResult;
        }

        return serializeObject(complexObject);
    }


    //#endregion
}

export { EMEntity, EntityDocument, IBaseEntity }




