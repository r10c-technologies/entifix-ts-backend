import { EMEntityMultiKey } from '../../express-mongoose/emEntityMultiKey/emEntityMultiKey';
import { EMSession } from '../../express-mongoose/emSession/emSession';
import { EntityInfo } from '../../hc-core/hcMetaData/hcMetaData';
import { EMEntity, EntityDocument } from '../../express-mongoose/emEntity/emEntity';
declare function findEntityMultiKey<TEntity extends EMEntityMultiKey, TDocument extends EntityDocument>(session: EMSession, info: EntityInfo, undefinedOperator: any): Promise<TEntity>;
declare function findEntity<TEntity extends EMEntity, TDocument extends EntityDocument>(session: EMSession, info: EntityInfo, undefinedOperator: any): Promise<TEntity>;
export { findEntity, findEntityMultiKey };
