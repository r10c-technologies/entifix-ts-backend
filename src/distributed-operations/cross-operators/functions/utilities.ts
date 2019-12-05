
import { SearchOperator, AssertOperation } from "../schemas/CrossEnums";
import { IEntityKey } from "../../../express-mongoose/emEntityMultiKey/emEntityMultiKey";

function indentifySearchOperator ( undefinedOperator : any ) : { searchOperator : SearchOperator, identifier: IEntityKey | string }
{
    if ( undefinedOperator )
    {
        if (undefinedOperator.$byKey)
            return { searchOperator:  SearchOperator.byKey,  identifier: undefinedOperator.$byKey as IEntityKey };
        else if (undefinedOperator.$byId)
            return { searchOperator: SearchOperator.byId, identifier: undefinedOperator.$byId as string } ;    
    }

    return null;
}

function identifyAssertOperation( undefinedOperator : any ) : { assertOperator : AssertOperation, searchOperator? : SearchOperator, identifier?: string | IEntityKey, entityData: any }
{
    if (undefinedOperator)
    {
        let identifier: string | IEntityKey;
        
        if (undefinedOperator.$new && undefinedOperator.$new.$data) 
            return { assertOperator: AssertOperation.NewInstance, entityData: undefinedOperator.$new.$data };

        if (undefinedOperator.$assert && undefinedOperator.$assert.$data) {
            let entityData = undefinedOperator.$assert.$data;
            delete undefinedOperator.$assert.$data;
            let searchOperation = indentifySearchOperator(undefinedOperator.$assert);
            if (!searchOperation) {
                if (entityData && entityData.id)
                    identifier = entityData.id.toString();
                else if (entityData && entityData._id)
                    identifier = entityData._id.toString();

                return { assertOperator: AssertOperation.Assert, searchOperator: SearchOperator.byId, identifier, entityData };
            }
            else 
                return { assertOperator: AssertOperation.Assert, searchOperator: searchOperation.searchOperator, identifier: searchOperation.identifier, entityData };   
        }             
    }

    return null;
}


export {
    indentifySearchOperator,
    identifyAssertOperation
}