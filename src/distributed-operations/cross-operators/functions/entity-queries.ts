
import { EMEntityMultiKey, EntityKey } from '../../../express-mongoose/emEntityMultiKey/emEntityMultiKey';
import { EMSession } from '../../../express-mongoose/emSession/emSession';
import { EntityInfo } from '../../../hc-core/hcMetaData/hcMetaData';
import { EMEntity, EntityDocument } from '../../../express-mongoose/emEntity/emEntity';
import { SearchOperator } from '../schemas/CrossEnums';


// import { TransactionState } from '../schemas/CrossStates';

async function findEntityMultiKey<TEntity extends EMEntityMultiKey, TDocument extends EntityDocument>(session : EMSession, info : EntityInfo, undefinedOperator : any ) : Promise<TEntity> 
{
    let searchOperator = indentifySearchOperator(undefinedOperator);

    if (searchOperator)
    {
        switch ( searchOperator.searchOperator ) 
        {
            case SearchOperator.byKey:

                let key = searchOperator.value as EntityKey;
                return session.findByKey< TEntity, TDocument>(info, key);
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
                let id = searchOperator.value as string;
                return session.findEntity<TEntity, TDocument>(info, id);
                break;

            default:
                return null;
        }
    }
    else
        return null;
}

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
    findEntity, 
    findEntityMultiKey 
}

