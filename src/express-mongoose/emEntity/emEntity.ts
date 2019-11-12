import mongoose = require('mongoose');

import { Entity, EntityMovementFlow } from '../../hc-core/hcEntity/hcEntity';
import { EMSession } from '../emSession/emSession';
import { DefinedAccessor, DefinedEntity, PersistenceType, EntityInfo, ExpositionType, MemberBindingType } from '../../hc-core/hcMetaData/hcMetaData';
import { EntityEventLogType } from '../../amqp-events/amqp-entity-logger/AMQPEntityLogger';
import { AMQPEventManager } from '../../amqp-events/amqp-event-manager/AMQPEventManager';

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
        
        this.entityInfo.getAccessors().filter( accessor => accessor.exposition ).forEach( accessor => {
            let nameSerialized = accessor.serializeAlias || accessor.name;
            if ( accessor.activator != null && this[accessor.name] != null) {
                if (accessor.activator.includeDuringSerialization) {
                    if (accessor.type == "Array") 
                        simpleObject[nameSerialized] = ( this[accessor.name] as Array<EMEntity>).map( e =>  e._id); 
                    else
                        simpleObject[nameSerialized] = ( this[accessor.name] as EMEntity )._id;
                }
            }
            else
                simpleObject[nameSerialized] = this[accessor.name];
        });

        return simpleObject;
    }

    static deserializeAccessors (info : EntityInfo, simpleObject : any) : { persistent? : any, nonPersistent? : any, readOnly? : any, nonValid? : any, ownArrayController? : any }
    {
        let persistent : any;
        let nonPersistent : any;
        let readOnly : any;
        let ownArrayController : any;

        info.getAccessors().filter( accessor => accessor.exposition ).forEach( accessor => {

            let exposedName = accessor.serializeAlias || accessor.name;
            let persistentName = accessor.persistentAlias || accessor.name;

            if (accessor.exposition == ExpositionType.Normal || accessor.exposition == ExpositionType.System)
            {
                let isPersistent = accessor.schema != null || accessor.persistenceType == PersistenceType.Auto;
                if (isPersistent)
                {
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
                    else if ((simpleObject as Object).hasOwnProperty(exposedName)) 
                        persistent[persistentName] = simpleObject[exposedName];
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

        let nonValid = Object.keys(simpleObject).length > 0 ? simpleObject : null;
        
        return { persistent, nonPersistent, readOnly, nonValid, ownArrayController };
    }

    save() : Promise<EntityMovementFlow>
    {
        return new Promise<EntityMovementFlow>( (resolve, reject) => 
        {
            this.onSaving().then( 
                movFlow => 
                {
                    if (movFlow.continue)
                    {
                        this.syncActibableAccessors();
                        
                        if (this._document.isNew)
                        {
                            this._session.createDocument(this.entityInfo.name, this._document).then(
                                documentCreated => {
                                    this._document = documentCreated;
                                    let asynkTask = this.onSaved();
                                    this.triggerAMQP(EntityEventLogType.created);
                                    if (asynkTask)
                                        asynkTask.then( ()=> resolve({ continue: true})).catch( () => resolve({ continue: true}));
                                    else
                                        resolve({ continue: true });
                                },
                                error  =>{
                                    console.error(`Error on create a document inside an entity: ${this.entityInfo.name}`);
                                    reject(error);
                                }
                            );
                        }
                        else
                        {
                            this._session.updateDocument(this.entityInfo.name, this._document).then(
                                documentUpdated => {
                                    this._document = documentUpdated;
                                    let asynkTask = this.onSaved();
                                    this.triggerAMQP(EntityEventLogType.updated);
                                    if (asynkTask)
                                        asynkTask.then( ()=> resolve({ continue: true})).catch( () => resolve({ continue: true}));
                                    else
                                        resolve({ continue: true });
                                },
                                error => {
                                    console.error(`Error on update a document insde an entity: ${this.entityInfo.name}(${this._id.toString()})`);
                                    reject(error);
                                }
                            );
                        }
                    }
                    else
                        resolve(movFlow);
                },
                reject // Reject passed
            );               
        });
    }

    delete () : Promise<EntityMovementFlow>
    {
        return new Promise<EntityMovementFlow>( (resolve, reject) => {

            this.onDeleting().then(
                movFlow => 
                {
                    if (movFlow.continue)
                    {
                        this.session.deleteDocument(this.entityInfo.name, this._document).then( 
                            ()=> { 
                                this.onDeleted(); 
                                this.triggerAMQP(EntityEventLogType.deleted);
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
        return new Promise<EntityMovementFlow>( 
            (resolve, reject )=> {
                resolve( { continue : true } );               
        });
    }

    protected onDeleting() : Promise<EntityMovementFlow>
    {
        return new Promise<EntityMovementFlow>( 
            (resolve, reject )=> {
                resolve( { continue : true });               
        });
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

    private syncActibableAccessors() : void
    {
        this.entityInfo.getAccessors().filter( a => a.activator != null && (a.type == 'Array' || a.activator.bindingType == MemberBindingType.Snapshot) ).forEach( accessor => {
            let thisObject = this;
            thisObject[accessor.name] = thisObject[accessor.name];
        });
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
    { return this._document._id; }

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
}

export { EMEntity, EntityDocument, IBaseEntity }




