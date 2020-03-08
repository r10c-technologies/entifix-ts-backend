import { EMEntityOperationMetadata } from "../../../extensibility/type-schema/EMEntityOperationMetadata"
import { EMEntityMetaOperationType } from "../../../extensibility/type-schema/enumeration";
import { EntityMovementFlow } from "../../../hc-core/hcEntity/hcEntity";
import { EMEntity } from "../../../express-mongoose/emEntity/emEntity";
import { addEntityMetadataOperation } from "../../../extensibility/metadata/function";
import { checkBlockingEntity, BlockingInfo } from "../functions/EntityLock";

function VerifyLocking() 
{
    return function(target : { new( ) : EMEntity }) {
        let entitityOperationMetadata = new EMEntityOperationMetadata();
        entitityOperationMetadata.addOperationType([ EMEntityMetaOperationType.BeforeSave, EMEntityMetaOperationType.BeforeDelete] );  
        entitityOperationMetadata.operationMethod = entity => checkForEntityLock(entity);

        addEntityMetadataOperation(target, entitityOperationMetadata);
    }
}

async function checkForEntityLock(entity : EMEntity) : Promise<EntityMovementFlow>
{
    let session = entity.session;
    let entityBlock = await checkBlockingEntity(entity);

    if (entityBlock) 
        return { continue: false, message: entityBlock.customOperationReference }
    else
        return { continue: true };
}

export {
    VerifyLocking
}




