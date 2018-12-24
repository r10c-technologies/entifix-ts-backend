import { EntityInfo, IMetaDataInfo } from '../hcMetaData/hcMetaData';
declare abstract class Entity implements IMetaDataInfo {
    entityInfo: EntityInfo;
    constructor();
    abstract save(): Promise<EntityMovementFlow>;
    abstract delete(): Promise<EntityMovementFlow>;
    protected abstract onSaving(): Promise<EntityMovementFlow>;
    protected abstract onDeleting(): Promise<EntityMovementFlow>;
    protected abstract onDeleted(): void;
    protected abstract onSaved(): void;
    abstract serializeExposedAccessors(): any;
    static getInfo(): EntityInfo;
    abstract equals(otherEntity: Entity): boolean;
}
interface EntityMovementFlow {
    continue: boolean;
    message?: string;
    details?: any;
}
export { EntityMovementFlow, Entity };
