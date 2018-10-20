import { EntityInfo, MemberActivator, AccessorInfo, MemberBindingType } from '../../hc-core/hcMetaData/hcMetaData';
import { Entity } from '../../hc-core/hcEntity/hcEntity';
import { EMEntity, EntityDocument } from '../emEntity/emEntity';
import { EMSession } from '../emSession/emSession';
declare class EMMemberActivator<TEntity extends EMEntity, TDocument extends EntityDocument> extends MemberActivator {
    private _bindingType;
    private _extendRoute;
    private _resourcePath;
    constructor(entityInfo: EntityInfo, bindingType: MemberBindingType, extendRoute: boolean);
    constructor(entityInfo: EntityInfo, bindingType: MemberBindingType, extendRoute: boolean, options: {
        resourcePath?: string;
    });
    activateMember(entity: Entity, session: EMSession, accessorInfo: AccessorInfo, options?: {
        oldValue?: any;
    }): Promise<{
        oldValue?: any;
        newValue: any;
    }>;
    private loadSingleInstanceFromDB;
    private loadArrayInstanceFromDB;
    private castSingleInstanceInEntity;
    private castArrayInstanceInEntity;
    readonly bindingType: MemberBindingType;
    readonly extendRoute: boolean;
    readonly resourcePath: string;
    readonly referenceType: string;
}
export { EMMemberActivator };
