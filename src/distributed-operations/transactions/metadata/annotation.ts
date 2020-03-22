import { EMEntityOperationMetadata } from "../../../extensibility/type-schema/EMEntityOperationMetadata"
import { EMEntityMetaOperationType } from "../../../extensibility/type-schema/enumeration";
import { EMEntity } from "../../../express-mongoose/emEntity/emEntity";
import { addEntityMetadataOperation } from "../../../extensibility/metadata/function";
import { LockingType } from "./annotation-enum";

import { checkBlockingEntity, lockEntity, unlockEntity, BlockingInfo } from "../functions/EntityLock";
import { EntityMovementFlow } from "../../../hc-core/hcEntity/hcEntity";




function VerifyLocking();
function VerifyLocking(params: { lockingType? : LockingType | Array<LockingType> });
function VerifyLocking(params?: { lockingType? : LockingType | Array<LockingType> }) 
{
    return function(target : any) {
        let lockingType = params && params.lockingType ? params.lockingType : [ LockingType.Create, LockingType.Update, LockingType.Delete ];

        if (!(lockingType instanceof Array))
            lockingType = [ lockingType ];

        let operationType = new Array<EMEntityMetaOperationType>();
        let incluceCreate = false, includeUpdate = false;

        for (let lt of lockingType) {
            if (lt == LockingType.Create) 
                incluceCreate = true;

            if (lt == LockingType.Update)
                includeUpdate = true;

            if (lt == LockingType.Create || lt == LockingType.Update) 
                if (!operationType.find( e => e == EMEntityMetaOperationType.BeforeSave))
                    operationType.push(EMEntityMetaOperationType.BeforeSave);
            
            if (lt == LockingType.Delete) 
                if (!operationType.find( e => e == EMEntityMetaOperationType.BeforeDelete))
                    operationType.push(EMEntityMetaOperationType.BeforeDelete);            
        }

        let entitityOperationMetadata = new EMEntityOperationMetadata();
        entitityOperationMetadata.addOperationType(operationType);  
        entitityOperationMetadata.operationMethod = entity => _checkForEntityLockWithConditions(entity, incluceCreate, includeUpdate);
        addEntityMetadataOperation(target, entitityOperationMetadata);
    }
}

function Locking();
function Locking( params: { lockingType? : LockingType | Array<LockingType> } );
function Locking( params?: { lockingType? : LockingType | Array<LockingType> })
{
    return function( target : any) {
        let lockingType = params && params.lockingType ? params.lockingType : [ LockingType.Create, LockingType.Update, LockingType.Delete ];

        if (!(lockingType instanceof Array))
            lockingType = [ lockingType ];

        let lockOperationType = new Array<EMEntityMetaOperationType>();
        let unlockOperationType = new Array<EMEntityMetaOperationType>();
        let incluceCreate = false, includeUpdate = false;

        for (let lt of lockingType) {
            if (lt == LockingType.Create) 
                incluceCreate = true;

            if (lt == LockingType.Update)
                includeUpdate = true;

            if (lt == LockingType.Create || lt == LockingType.Update) {
                if (!lockOperationType.find( e => e == EMEntityMetaOperationType.BeforeSave))
                    lockOperationType.push(EMEntityMetaOperationType.BeforeSave);

                if (!unlockOperationType.find( e => e == EMEntityMetaOperationType.AfterSave))
                    unlockOperationType.push(EMEntityMetaOperationType.AfterSave);
            }

            if (lt == LockingType.Delete) {
                if (!lockOperationType.find( e => e == EMEntityMetaOperationType.BeforeDelete))
                    lockOperationType.push(EMEntityMetaOperationType.BeforeDelete);
                
                if (!unlockOperationType.find( e => e == EMEntityMetaOperationType.AfterDelete))
                    unlockOperationType.push(EMEntityMetaOperationType.AfterDelete);
            }
        }

        let entityLockOperation = new EMEntityOperationMetadata();
        entityLockOperation.addOperationType( lockOperationType );  
        entityLockOperation.operationMethod = entity => _lockEntityWithConditions(entity, incluceCreate, includeUpdate);
        addEntityMetadataOperation(target, entityLockOperation);
    
        let entityUnlockOperation = new EMEntityOperationMetadata();
        entityUnlockOperation.addOperationType(unlockOperationType);  
        entityUnlockOperation.operationMethod = entity => _unlockEntity(entity);
        addEntityMetadataOperation(target, entityUnlockOperation);
    }
}





// Annotations Logic
// ===================================================================================================================================================================
 
async function _checkForEntityLockWithConditions(entity : EMEntity, incluceCreate : boolean, includeUpdate : boolean) : Promise<EntityMovementFlow>
{
    let entityBlock : BlockingInfo
    if ( (entity.isNew && incluceCreate) || (!entity.isNew && includeUpdate) )
        entityBlock = await checkBlockingEntity(entity);

    if (entityBlock) 
        return { continue: false, message: entityBlock.customOperationReference }
    else
        return { continue: true };
}

function _lockEntityWithConditions(entity : EMEntity, incluceCreate : boolean, includeUpdate : boolean) : Promise<EntityMovementFlow>
{
    if ( entity ) {
        if ( (entity.isNew && incluceCreate) || (!entity.isNew && includeUpdate) )
            return lockEntity(entity).then( () => { return {continue:true}; } );
        else
            return Promise.resolve({continue:true});
    }
    else
        return Promise.reject('The entity to lock is null');
}

async function _unlockEntity(entity : EMEntity) : Promise<EntityMovementFlow>
{
    if (entity)
        return unlockEntity(entity).then( () => { return {continue:true}; } );
    else
        return Promise.reject('The entity to unlock is null');
}


export {
    VerifyLocking,
    Locking
}




