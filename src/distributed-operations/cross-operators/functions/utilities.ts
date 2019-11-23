import { SearchOperator } from "../schemas/CrossEnums";
import { EntityKey } from "../../../express-mongoose/emEntityMultiKey/emEntityMultiKey";

function indentifySearchOperator ( undefinedOperator : any ) : { searchOperator : SearchOperator, value: EntityKey | string }
{
    if ( undefinedOperator )
    {
        if (undefinedOperator.$byKey)
        {
            let value = undefinedOperator.$byKey as EntityKey;
            return { searchOperator:  SearchOperator.byKey,  value };
        }
        else if (undefinedOperator.$byId)
        {
            let value = undefinedOperator.$byId as string;
            return { searchOperator: SearchOperator.byId, value } ;    
        }
    }

    return null;
}

export {
    indentifySearchOperator
}