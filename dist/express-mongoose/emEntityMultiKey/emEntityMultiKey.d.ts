import { EntityInfo } from '../../hc-core/hcMetaData/hcMetaData';
import { EntityDocument, EMEntity } from "../emEntity/emEntity";
interface IEntityKey {
    serviceName: string;
    entityName: string;
    value: string;
}
interface IEntityKeyModel extends IEntityKey, EntityDocument {
}
declare class EntityKey extends EMEntity implements IEntityKey {
    serviceName: string;
    entityName: string;
    value: string;
}
interface IEntityMultiKey {
    keys: Array<IEntityKey>;
}
interface IEntityMultiKeyModel extends IEntityMultiKey, EntityDocument {
}
declare class EMEntityMultiKey extends EMEntity implements IEntityMultiKey {
    static isMultiKeyEntity(entityInfo: EntityInfo): boolean;
    private _keys;
    keys: Array<EntityKey>;
}
export { EMEntityMultiKey, IEntityMultiKey, IEntityMultiKeyModel, EntityKey, IEntityKey, IEntityKeyModel };
