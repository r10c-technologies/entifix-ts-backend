import { EMEntityMultiKey, EntityKey, IEntityKey } from '../../../express-mongoose/emEntityMultiKey/emEntityMultiKey';
import { EMSession } from '../../../express-mongoose/emSession/emSession';
import { EntityInfo } from '../../../hc-core/hcMetaData/hcMetaData';
import { EMEntity, EntityDocument } from '../../../express-mongoose/emEntity/emEntity';
import { SearchOperator } from '../schemas/CrossEnums';
import { identifySearchOperator } from './utilities';

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

export { 
    findEntity, 
    findEntityMultiKey
}

