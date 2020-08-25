
import { EMEntityMultiKey, EntityKey, IEntityKey } from '../../../express-mongoose/emEntityMultiKey/emEntityMultiKey';
import { EMSession } from '../../../express-mongoose/emSession/emSession';
import { EntityInfo } from '../../../hc-core/hcMetaData/hcMetaData';
import { EMEntity, EntityDocument } from '../../../express-mongoose/emEntity/emEntity';
import { SearchOperator, AssertOperation } from '../schemas/CrossEnums';
import { identifyAssertOperation, identifySearchOperator } from './utilities';
import { findDocumentMultiKey } from '..';
import { findDocument } from './document-queries';
import { EMEntityManager } from '../../../express-mongoose/emEntityManager/emEntityManager';

async function findEntityMultiKey<TEntity extends EMEntityMultiKey, TDocument extends EntityDocument>(session : EMSession, info : EntityInfo, undefinedOperator : any ) : Promise<TEntity> 
{
    let searchOperator = identifySearchOperator(undefinedOperator);

    if (searchOperator)
    {
        switch ( searchOperator.searchOperator ) 
        {
            case SearchOperator.byKeys:
                let filter = {
                    $or: (searchOperator.identifier as Array<IEntityKey>).map( key => {
                        return {
                            alternativeKeys: {
                                $elemMatch: {
                                    serviceName: { '$regex': new RegExp(["^", key.serviceName, "$"].join(""), "i") },
                                    entityName: { '$regex': new RegExp(["^", key.entityName, "$"].join(""), "i") },
                                    value: key.value                        
                                }
                            }        
                        };
                    })
                }; 

                return session.listEntitiesByQuery<TEntity, TDocument>(info, filter)
                                .then( entities => entities && entities.length > 0 ? entities[0] : null );
        
            case SearchOperator.byKey:
                let key = searchOperator.identifier as EntityKey;
                return session.findEntityByKey<TEntity, TDocument>(info, key);

            default:
                return findEntity<TEntity, TDocument>(session, info, undefinedOperator);
        }
    }
    else
        return null;
}

async function findEntity<TEntity extends EMEntity, TDocument extends EntityDocument>(session : EMSession, info : EntityInfo, undefinedOperator : any ) : Promise<TEntity> 
{
    let searchOperator = identifySearchOperator(undefinedOperator);

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




async function assertEntitya<TEntity extends EMEntity, TDocument extends EntityDocument>(session : EMSession, info : EntityInfo, undefinedOperator: any) 
{
    let assertOperationDetails = identifyAssertOperation(undefinedOperator);
    let entity = await findEntity<TEntity, TDocument>(session, info, undefinedOperator);

    return await _processEntityAssertion<TEntity, TDocument>(
        session, 
        info, 
        assertOperationDetails.assertOperator, 
        assertOperationDetails.assertOperator, 
        entity
    );
}


async function assertEntityMultiKey<TEntity extends EMEntityMultiKey, TDocument extends EntityDocument>(session : EMSession, info : EntityInfo, undefinedOperator: any) 
{
    let assertOperationDetails = identifyAssertOperation(undefinedOperator);
    let entity = await findEntityMultiKey<TEntity, TDocument>(session, info, undefinedOperator);

    return await _processEntityAssertion<TEntity, TDocument>(
        session, 
        info, 
        assertOperationDetails.assertOperator, 
        assertOperationDetails.assertOperator, 
        entity
    );
}

async function _processEntityAssertion<TEntity extends EMEntity, TDocument extends EntityDocument>(
    session: EMSession,
    info : EntityInfo,
    assertOperation : AssertOperation,
    entityData : any,
    foundEntity : TEntity
) : Promise<TEntity>
{
    let entityManager = new EMEntityManager(session);

    switch(assertOperation) {
        case AssertOperation.Assert:
            if (!foundEntity) {
                let ingestion = await entityManager.ingestAsEntity<TEntity, TDocument>(info, entityData);
                return ingestion.entity;
            }
            else    
                return foundEntity;

        case AssertOperation.AssertOverride:
            if (!foundEntity) {
                let ingestion = await entityManager.ingestAsEntity<TEntity, TDocument>(info, entityData);
                return ingestion.entity;
            }
            else {
                

            }

        case AssertOperation.NewInstance:
            let ingestion = await entityManager.ingestAsEntity<TEntity, TDocument>(info, entityData);
            return ingestion.entity;
    }
}




// async function assertEntity<TEntity extends EMEntity, TDocument extends EntityDocument>(session : EMSession, info : EntityInfo, undefinedOperator : any) : Promise<TEntity>;
// async function assertEntity<TEntity extends EMEntityMultiKey, TDocument extends EntityDocument>(session : EMSession, info : EntityInfo, undefinedOperator : any) : Promise<TEntity>;
// async function assertEntity<TEntity extends EMEntityMultiKey, TDocument extends EntityDocument>(session : EMSession, info : EntityInfo, undefinedOperator : any) : Promise<TEntity>
// {


//     let entity = findEntity
    


//     let asserOperationDetails = identifyAssertOperation(undefinedOperator);

//     if (asserOperationDetails) {

//     }


//     if (!searchOperator) {
//         let assertOperation = identifyAssertOperation(undefinedOperator);
//         if (assertOperation && assertOperation.entityData) {

//             let validatedData = EMEntity.deserializeAccessors(info, assertOperation.entityData);
                    
//             switch( assertOperation.assertOperator ) 
//             {
//                 case AssertOperation.Assert:
//                     let previousDocument : TDocument;
//                     if (assertOperation.searchOperator == SearchOperator.byKey) 
//                         previousDocument = await findDocumentMultiKey<TDocument>(session, info, { $byKey: assertOperation.identifier });
//                     else if (assertOperation.searchOperator == SearchOperator.byId) 
//                         previousDocument = await findDocument<TDocument>(session, info, { $byId: assertOperation.identifier });
                    
//                     if (validatedData && validatedData.persistent && validatedData.persistent._id)
//                         delete validatedData.persistent._id;

//                     let currentInstance = session.instanceDocument<TDocument>(info, validatedData.persistent, { existingDocument: previousDocument } );
//                     return await session.activateEntityInstance<TEntity, TDocument>(info, currentInstance.document, { changes: currentInstance.changes } );
//                     break;
                
//                 case AssertOperation.NewInstance:
//                     if (validatedData && validatedData.persistent && validatedData.persistent._id)
//                         delete validatedData.persistent._id;

//                     let validatedDoc = session.instanceDocument<TDocument>(info, validatedData.persistent);
//                     return await session.activateEntityInstance<TEntity, TDocument>(info, validatedDoc.document);
//                     break;

//                 default:
//                     return null;
//             }
//         }
//         else
//             return null;
//     }
//     else
//         return await findEntityMultiKey<TEntity, TDocument>(session, info, undefinedOperator);
// } 


export { 
    findEntity, 
    findEntityMultiKey
}

