import { EntityInfo, MemberActivator, AccessorInfo, MemberBindingType } from '../../hc-core/hcMetaData/hcMetaData';
import { Entity } from '../../hc-core/hcEntity/hcEntity';
import { EMEntity, EntityDocument } from '../emEntity/emEntity';
import { EMSession } from '../emSession/emSession';
declare class GfsMemberActivator extends MemberActivator {
    private _defaultSchema;
    constructor(resourcePath: string, extendedRoute: boolean);
    constructor(resourcePath: string, extendedRoute: boolean, options: {
        schema?: any;
    });
    activateMember(entity: Entity, session: EMSession, accessorInfo: AccessorInfo, options?: {
        oldValue?: any;
    }): Promise<{
        oldValue?: any;
        newValue: any;
    }>;
    private loadFileHeader;
    readonly referenceType: string;
    readonly defaultSchema: any;
}
declare class EMMemberActivator<TEntity extends EMEntity, TDocument extends EntityDocument> extends MemberActivator {
    private _entityInfo;
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
    readonly entityInfo: EntityInfo;
    readonly referenceType: string;
    readonly defaultSchema: any;
}
interface IChunkMember {
    name: string;
    fileExtension: string;
    size: number;
}
export { EMMemberActivator, GfsMemberActivator, IChunkMember };
