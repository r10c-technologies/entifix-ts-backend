import { EMSession } from "../emSession/emSession"
import { EMEntity, EntityDocument } from "../emEntity/emEntity";
import { EntityInfo } from "../../hc-core/hcMetaData/hcMetaData";


class EMEntityManager
{
    //#region Properties
    
    private _session : EMSession;

    //#endregion

    //#region Methods


    constructor(session : EMSession) 
    {
        this._session = session;
    }



    ingestAsDocument<TDocument extends EntityDocument>(entityInfo: EntityInfo, data : any) : Promise<DocumentIngest<TDocument>>
    {
        let validation = EMEntity.deserializeAccessors(entityInfo, data);
        let persistentData = validation ? validation.persistent : null;
        let entityId : string;

        if (validation && persistentData) {
            if (persistentData._id) {
                entityId = persistentData._id;
                delete persistentData._id;
            }

            let ingest = (existingDocument : TDocument) : DocumentIngest<TDocument> => {
                let currentInstance = this._session.instanceDocument<TDocument>(entityInfo, persistentData, { existingDocument });
                return { document: currentInstance.document, changes: currentInstance.changes, deserializationDetails: validation };
            };

            if (entityId)
                return this._session.findDocument<TDocument>(entityInfo.name, entityId).then( document => ingest(document) );
            else 
                return Promise.resolve(ingest(null));
        }
        else
            return Promise.resolve(null); 
    }



    ingestAsEntity<TEntity extends EMEntity, TDocument extends EntityDocument>(entityInfo: EntityInfo, data : any) : Promise<EntityIngest<TEntity, TDocument>>
    {
        if (data) {
            let operatorName : string;
            if (data.op) {
                operatorName = data.op;
                delete data.op;
            }
            else if (data.operator) {
                operatorName = data.operator;
                delete data.operator;
            }
            
            let parameters : Array<{key: string, value: any}>;
            if (data.params && data.params instanceof Array && data.params.length > 0) {
                parameters = data.params.map( p => { return {key: p.key, value:p.value}; });
                delete data.params;
            }
            else if (data.parameters && data.parameters instanceof Array && data.parameters.length > 0) {
                parameters = data.parameters.map( p => { return {key: p.key, value:p.value}; });
                delete data.parameters;
            }

            let operation = { name: operatorName, parameters };
            
            return this.ingestAsDocument<TDocument>(entityInfo, data)
                        .then( docIngest => {
                            if (docIngest && docIngest.document) 
                                return this._session
                                    .activateEntityInstance<TEntity, TDocument>(entityInfo, docIngest.document, { changes: docIngest.changes} )
                                    .then( entity => { return { ...docIngest, entity, operation }; });                            
                            else
                                return { ...docIngest, entity: null };
                        });
        }
        else
            return Promise.resolve(null);
    }




    //#endregion

    //#region Accessors

    get session()
    { return this._session; }

    //#endregion
}

interface DocumentIngest<TDocument extends EntityDocument>
{
    document: TDocument;
    changes: Array<{property: string, oldValue: any, newValue: any}>
    deserializationDetails: {
        persistent?: any;
        nonPersistent?: any;
        readOnly?: any;
        nonValid?: any;
    };
}

interface EntityIngest<TEntity extends EMEntity, TDocument extends EntityDocument> extends DocumentIngest<TDocument>
{
    entity: TEntity
    operation?: {
        name: string;
        parameters: Array<{key: string, value: any}>;
    };
}

export {
    EMEntityManager,
    DocumentIngest,
    EntityIngest
}
