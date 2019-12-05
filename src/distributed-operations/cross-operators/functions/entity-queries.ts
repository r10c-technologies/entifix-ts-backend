
import { EMEntityMultiKey, EntityKey } from '../../../express-mongoose/emEntityMultiKey/emEntityMultiKey';
import { EMSession } from '../../../express-mongoose/emSession/emSession';
import { EntityInfo } from '../../../hc-core/hcMetaData/hcMetaData';
import { EMEntity, EntityDocument } from '../../../express-mongoose/emEntity/emEntity';
import { SearchOperator, AssertOperation } from '../schemas/CrossEnums';
import { indentifySearchOperator, identifyAssertOperation } from './utilities';
import { findDocumentMultiKey } from '..';
import { findDocument } from './document-queries';

async function findEntityMultiKey<TEntity extends EMEntityMultiKey, TDocument extends EntityDocument>(session : EMSession, info : EntityInfo, undefinedOperator : any ) : Promise<TEntity> 
{
    let searchOperator = indentifySearchOperator(undefinedOperator);

    if (searchOperator)
    {
        switch ( searchOperator.searchOperator ) 
        {
            case SearchOperator.byKey:
                let key = searchOperator.identifier as EntityKey;
                return session.findEntityByKey<TEntity, TDocument>(info, key);
                break;

            default:
                return findEntity<TEntity, TDocument>(session, info, undefinedOperator);
        }
    }
    else
        return null;
}

async function findEntity<TEntity extends EMEntity, TDocument extends EntityDocument>(session : EMSession, info : EntityInfo, undefinedOperator : any ) : Promise<TEntity> 
{
    let searchOperator = indentifySearchOperator(undefinedOperator);

    if (searchOperator)
    {
        switch ( searchOperator.searchOperator ) 
        {
            case SearchOperator.byId:
                let id = searchOperator.identifier as string;
                return session.findEntity<TEntity, TDocument>(info, id);
                break;

            default:
                return null;
        }
    }
    else
        return null;
}

async function assertEntity<TEntity extends EMEntity, TDocument extends EntityDocument>(session : EMSession, info : EntityInfo, undefinedOperator : any) : Promise<TEntity>;
async function assertEntity<TEntity extends EMEntityMultiKey, TDocument extends EntityDocument>(session : EMSession, info : EntityInfo, undefinedOperator : any) : Promise<TEntity>;
async function assertEntity<TEntity extends EMEntityMultiKey, TDocument extends EntityDocument>(session : EMSession, info : EntityInfo, undefinedOperator : any) : Promise<TEntity>
{
    let searchOperator = indentifySearchOperator(undefinedOperator);

    if (!searchOperator) {
        let assertOperation = identifyAssertOperation(undefinedOperator);
        if (assertOperation && assertOperation.entityData) {

            let validatedData = EMEntity.deserializeAccessors(info, assertOperation.entityData);
                    
            switch( assertOperation.assertOperator ) 
            {
                case AssertOperation.Assert:
                    let previousDocument : TDocument;
                    if (assertOperation.searchOperator == SearchOperator.byKey) 
                        previousDocument = await findDocumentMultiKey<TDocument>(session, info, { $byKey: assertOperation.identifier });
                    else if (assertOperation.searchOperator == SearchOperator.byId) 
                        previousDocument = await findDocument<TDocument>(session, info, { $byId: assertOperation.identifier });
                    
                    if (validatedData && validatedData.persistent && validatedData.persistent._id)
                        delete validatedData.persistent._id;

                    let currentInstance = session.instanceDocument<TDocument>(info, validatedData.persistent, { existingDocument: previousDocument } );
                    return await session.activateEntityInstance<TEntity, TDocument>(info, currentInstance.document, { changes: currentInstance.changes } );
                    break;
                
                case AssertOperation.NewInstance:
                    if (validatedData && validatedData.persistent && validatedData.persistent._id)
                        delete validatedData.persistent._id;

                    let validatedDoc = session.instanceDocument<TDocument>(info, validatedData.persistent);
                    return await session.activateEntityInstance<TEntity, TDocument>(info, validatedDoc.document);
                    break;

                default:
                    return null;
            }
        }
        else
            return null;
    }
    else
        return await findEntityMultiKey<TEntity, TDocument>(session, info, undefinedOperator);
} 


export { 
    findEntity, 
    findEntityMultiKey 
}

