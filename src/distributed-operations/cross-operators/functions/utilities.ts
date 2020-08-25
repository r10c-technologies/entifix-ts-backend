
import { SearchOperator, AssertOperation } from "../schemas/CrossEnums";
import { IEntityKey } from "../../../express-mongoose/emEntityMultiKey/emEntityMultiKey";

function identifySearchOperator ( undefinedOperator : any ) : { searchOperator : SearchOperator, identifier: IEntityKey | string | Array<IEntityKey> }
{
    if ( undefinedOperator )
    {
        if (undefinedOperator.$byKeys)
            return { searchOperator:  SearchOperator.byKeys,  identifier: undefinedOperator.$byKeys as Array<IEntityKey> };
        if (undefinedOperator.$byKey)
            return { searchOperator:  SearchOperator.byKey,  identifier: undefinedOperator.$byKey as IEntityKey };
        else if (undefinedOperator.$byId)
            return { searchOperator: SearchOperator.byId, identifier: undefinedOperator.$byId as string } ;    
    }

    return null;
}

function identifyAssertOperation( undefinedOperator : any ) : { assertOperator : AssertOperation, entityData: any }
{
    if (undefinedOperator)
    {
        let assertOperator : AssertOperation;
        let entityData : any;

        if(undefinedOperator.$assert) {
            assertOperator = AssertOperation.Assert;
            entityData = undefinedOperator.$assert;
        }
        else if (undefinedOperator.$assertOverride) {
            assertOperator = AssertOperation.AssertOverride;
            entityData = undefinedOperator.$assertOverride;
        }
        else if (undefinedOperator.$new) {
            assertOperator = AssertOperation.NewInstance;
            entityData = undefinedOperator.$assertOverride;
        }

        let identifiedSearchOperation = identifySearchOperator(undefinedOperator);

        return { 
            assertOperator, 
            entityData
        };        
    }

    return null;
}


export {
    identifySearchOperator,
    identifyAssertOperation
}