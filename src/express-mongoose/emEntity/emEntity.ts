import mongoose = require('mongoose');

import { Entity, EntityMovementFlow } from '../../hc-core/hcEntity/hcEntity';
import { EMSession } from '../emSession/emSession';
import { DefinedAccessor, DefinedEntity, PersistenceType, EntityInfo, ExpositionType, MemberBindingType } from '../../hc-core/hcMetaData/hcMetaData';
import { emitKeypressEvents } from 'readline';

interface EntityDocument extends mongoose.Document
{
    created : Date,
    modified : Date,
    deleted : Date,
    deferredDeletion: Boolean
}


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
        
        if ( document )
            this._document = document;
        else
            this._document = {} as any;
    }

    serializeExposedAccessors () : any
    {
        var simpleObject : any = {};
        
        this.entityInfo.getAccessors().filter( accessor => accessor.exposition ).forEach( accessor => {
            let nameSerialized = accessor.serializeAlias || accessor.name;
            if ( accessor.activator != null && this[accessor.name] != null )
                simpleObject[nameSerialized] = ( this[accessor.name] as EMEntity )._id;
            else
                simpleObject[nameSerialized] = this[accessor.name];
        });

        return simpleObject;
    }

    static deserializeAccessors (info : EntityInfo, simpleObject : any) : { persistent? : any, nonPersistent? : any, readOnly? : any, nonValid? : any }
    {
        let persistent : any;
        let nonPersistent : any;
        let readOnly : any;
        
        info.getAccessors().filter( accessor => accessor.exposition ).forEach( accessor => {

            let exposedName = accessor.serializeAlias || accessor.name;
            let persistentName = accessor.persistentAlias || accessor.name;

            if (accessor.exposition == ExpositionType.Normal)
            {
                let isPersistent = accessor.schema != null || accessor.persistenceType == PersistenceType.Auto;
                if (isPersistent)
                {
                    if ((simpleObject as Object).hasOwnProperty(exposedName))
                    {
                        if (!persistent)
                            persistent = {};
                        persistent[persistentName] = simpleObject[exposedName];
                    }
                }
                else
                {
                    if ((simpleObject as Object).hasOwnProperty(exposedName))
                    {
                        if (!nonPersistent)
                            nonPersistent = {};
                        nonPersistent[exposedName] = simpleObject[exposedName];
                    }
                }
            }
            if (accessor.exposition == ExpositionType.ReadOnly)
            {
                if ((simpleObject as Object).hasOwnProperty(exposedName))
                {
                    if (!readOnly)
                        readOnly = {};
                    readOnly[exposedName] = simpleObject[exposedName];
                }                
            }

            delete simpleObject[exposedName];
        });

        let nonValid = Object.keys(simpleObject).length > 0 ? simpleObject : null;
        
        return { persistent, nonPersistent, readOnly, nonValid };
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
                                    this.onSaved();
                                    resolve({ continue: true});
                                },
                                error  =>{
                                    console.error('Error on create a document inside an entity');
                                    reject(error);
                                }
                            );
                        }
                        else
                        {
                            this._session.updateDocument(this.entityInfo.name, this._document).then(
                                documentUpdated => {
                                    this._document = documentUpdated;
                                    this.onSaved();
                                    resolve({ continue: true });
                                },
                                error => {
                                    console.error('Error on update a document insde an entity');
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
                            ()=> { this.onDeleted(); resolve({continue:true}); },
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

    protected onSaved() : void
    {

    }

    protected onDeleted() : void
    {

    }

    static getSchema() : any
    {
        return this.prototype.entityInfo.getCompleteSchema();
    }

    getDocument() : EntityDocument
    {
        return this._document;
    }

    private syncActibableAccessors() : void
    {
        this.entityInfo.getAccessors().filter( a => a.activator != null && (a.type == 'Array' || a.activator.bindingType == MemberBindingType.Snapshot) ).forEach( accessor => {
            let thisObject = this;
            thisObject[accessor.name] = thisObject[accessor.name];
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

    @DefinedAccessor({ exposition: ExpositionType.ReadOnly, schema : {  type: Date, require: false } })
    get deleted () : Date
    { return this._document.deleted; }
    set deleted (value : Date)
    { this._document.deleted = value; }

    @DefinedAccessor({ exposition: ExpositionType.Normal, persistenceType: PersistenceType.Auto, serializeAlias: 'id' })
    get _id () : any
    { return this._document._id; }

    @DefinedAccessor({ exposition: ExpositionType.Normal, persistenceType: PersistenceType.Auto, serializeAlias: 'v' })
    get __v () : number
    { return this._document.__v; }

    @DefinedAccessor({ schema : { type: Boolean, require: true} })
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

    //#endregion
}

interface IBaseEntity
{
    created : Date,
    modified : Date
}

export { EMEntity, IBaseEntity, EntityDocument }




