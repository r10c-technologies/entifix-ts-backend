import { EMEntityMultiKey, IEntityKey } from '../../../express-mongoose/emEntityMultiKey/emEntityMultiKey';
import { EMSession } from '../../../express-mongoose/emSession/emSession';
import { EntityInfo } from '../../../hc-core/hcMetaData/hcMetaData';
import { EMEntity, EntityDocument } from '../../../express-mongoose/emEntity/emEntity';
import { AssertOperation } from '../schemas/CrossEnums';
import { identifyAssertOperation, identifySearchOperator } from './utilities';
import { findEntity, findEntityMultiKey } from './entity-queries';
import { EMEntityManager } from '../../../express-mongoose/emEntityManager/emEntityManager';
import { EntityMovementFlow } from '../../../hc-core/hcEntity/hcEntity';
import { exception } from 'console';

async function assertEntity<TEntity extends EMEntity, TDocument extends EntityDocument>(session : EMSession, info : EntityInfo, undefinedOperator: any) 
{
    let assertOperationDetails = identifyAssertOperation(undefinedOperator);
    let foundEntity = await findEntity<TEntity, TDocument>(session, info, undefinedOperator);
    let movFlowResult : EntityMovementFlow;

    let assertedEntity = await _processEntityAssertion<TEntity, TDocument>(
        session, 
        info, 
        assertOperationDetails.assertOperator, 
        assertOperationDetails.entityData, 
        foundEntity
    );

    if (assertedEntity.isNew)
        movFlowResult = await assertedEntity.save();

    return { assertedEntity, movFlowResult };
}


async function assertEntityMultiKey<TEntity extends EMEntityMultiKey, TDocument extends EntityDocument>(session : EMSession, info : EntityInfo, undefinedOperator: any) 
{
    let assertOperationDetails = identifyAssertOperation(undefinedOperator);
    let findOperationDetails = identifySearchOperator(undefinedOperator);
    let foundEntity = await findEntityMultiKey<TEntity, TDocument>(session, info, undefinedOperator);
    let newKeyAdded = false;
    let movFlowResult : EntityMovementFlow;

    let assertedEntity = await _processEntityAssertion<TEntity, TDocument>(
        session, 
        info, 
        assertOperationDetails.assertOperator, 
        assertOperationDetails.entityData, 
        foundEntity
    );

    let checkAdditionKey = (key : IEntityKey) => {
        let neededToAdd =
            !assertedEntity 
            || !assertedEntity.alternativeKeys 
            || !assertedEntity.alternativeKeys.find( ak => ak.serviceName == key.serviceName && ak.entityName == key.entityName && ak.value == key.value);

        if (neededToAdd) {
            assertedEntity.addKey(key);
            newKeyAdded = true;
        }
    };

    if (findOperationDetails.identifier instanceof Array)
        findOperationDetails.identifier.forEach(key => checkAdditionKey(key));
    else
        checkAdditionKey(findOperationDetails.identifier as IEntityKey);

    if (newKeyAdded || assertedEntity.isNew)
        movFlowResult = await assertedEntity.save();
    
    return { movFlowResult, assertedEntity };
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
                throw new exception("Not implemented yet");
            }

        case AssertOperation.NewInstance:
            let ingestion = await entityManager.ingestAsEntity<TEntity, TDocument>(info, entityData);
            return ingestion.entity;
    }
}


export {
    assertEntity,
    assertEntityMultiKey
}