import mongoose = require('mongoose');

import { Entity, EntityMovementFlow } from '../../hc-core/hcEntity/hcEntity';
import { EMSession } from '../emSession/emSession';
import { DefinedAccessor, DefinedEntity, PersistenceType } from '../../hc-core/hcMetaData/hcMetaData';
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

    


    save() : Promise<EntityMovementFlow>
    {
        return new Promise<EntityMovementFlow>( (resolve, reject) => 
        {
            this.onSaving().then( 
                movFlow => 
                {
                    if (movFlow.continue)
                    {
                        if (this._document._id)
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
                        else
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

    //#endregion


    //#region Accessors

    get session ()
    { return this._session };

    @DefinedAccessor({ exposed: true, schema : { type: Date, require: true } })
    get created () : Date
    { return this._document.created; }
    set created (value : Date)
    { this._document.created = value; }

    @DefinedAccessor({ exposed: true, schema : {  type: Date, require: false } })
    get modified () : Date
    { return this._document.modified; }
    set modified (value : Date)
    { this._document.modified = value; }

    @DefinedAccessor({ exposed: true, schema : {  type: Date, require: false } })
    get deleted () : Date
    { return this._document.deleted; }
    set deleted (value : Date)
    { this._document.deleted = value; }

    @DefinedAccessor({ exposed: true, persistenceType: PersistenceType.Auto, persistentAlias: 'id' })
    get _id () : any
    { return this._document._id; }

    @DefinedAccessor({ exposed: true, persistenceType: PersistenceType.Auto, persistentAlias: 'v' })
    get __v () : number
    { return this._document.__v; }

    @DefinedAccessor({ exposed: false, schema : { type: Boolean, require: true} })
    get deferredDeletion() : Boolean
    { return this._document.deferredDeletion; }
    set deferredDeletion( value : Boolean )
    { this.deferredDeletion = value; }

    //#endregion
}

interface IBaseEntity
{
    created : Date,
    modified : Date
}

export { EMEntity, IBaseEntity, EntityDocument }




