
import { EMEntityMultiKey, EntityKey } from '../../../express-mongoose/emEntityMultiKey/emEntityMultiKey';
import { EMSession } from '../../../express-mongoose/emSession/emSession';
import { EntityInfo } from '../../../hc-core/hcMetaData/hcMetaData';
import { EMEntity, EntityDocument } from '../../../express-mongoose/emEntity/emEntity';
import { SearchOperator } from '../schemas/CrossEnums';
import { indentifySearchOperator } from './utilities';


async function findDocumentMultiKey<TDocument extends EntityDocument>(session : EMSession, info : EntityInfo, undefinedOperator : any ) : Promise<TDocument> 
{
    let searchOperator = indentifySearchOperator(undefinedOperator);

    if (searchOperator)
    {
        switch ( searchOperator.searchOperator ) 
        {
            case SearchOperator.byKey:
                let key = searchOperator.identifier as EntityKey;
                return session.findDocumentByKey<TDocument>(info, key);
                break;

            default:
                return findDocument<TDocument>(session, info, undefinedOperator);
        }
    }
    else
        return null;
}

async function findDocument<TDocument extends EntityDocument>(session : EMSession, info : EntityInfo, undefinedOperator : any ) : Promise<TDocument> 
{
    let searchOperator = indentifySearchOperator(undefinedOperator);

    if (searchOperator)
    {
        switch ( searchOperator.searchOperator ) 
        {
            case SearchOperator.byId:
                let id = searchOperator.identifier as string;
                return session.findDocument<TDocument>(info.name, id);
                break;

            default:
                return null;
        }
    }
    else
        return null;
}

export { 
    findDocument, 
    findDocumentMultiKey 
}
