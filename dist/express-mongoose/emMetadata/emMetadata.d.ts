import { MemberActivator, AccessorInfo } from '../../hc-core/hcMetaData/hcMetaData';
import { Entity } from '../../hc-core/hcEntity/hcEntity';
import { EMEntity, EntityDocument } from '../emEntity/emEntity';
import { EMSession } from '../emSession/emSession';
declare class EMMemberActivator<TEntity extends EMEntity, TDocument extends EntityDocument> extends MemberActivator {
    activateMember(entity: Entity, session: EMSession, accessorInfo: AccessorInfo): Promise<void>;
}
export { EMMemberActivator };
