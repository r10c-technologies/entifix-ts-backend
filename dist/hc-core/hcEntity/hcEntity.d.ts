import { EntityInfo, IMetaDataInfo } from '../hcMetaData/hcMetaData';
declare abstract class Entity implements IMetaDataInfo {
    entityInfo: EntityInfo;
    constructor();
    abstract onSaving(): void;
    abstract onDeleting(): void;
    serializeExposedAccessors(): any;
    static getInfo(): EntityInfo;
}
export { Entity };
