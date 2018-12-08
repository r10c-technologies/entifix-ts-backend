import { EntityDocument, EMEntity } from "../emEntity/emEntity";
interface IEntityMultiKey {
    keys: Array<IKeyDetail>;
}
interface IEntityMultiKeyModel extends IEntityMultiKey, EntityDocument {
}
declare class EMEntityMultiKey extends EMEntity implements IEntityMultiKey {
    private _keys;
    keys: Array<KeyDetail>;
}
interface IKeyDetail {
    serviceName: string;
    entityName: string;
    value: string;
}
interface IKeyDetailModel extends IKeyDetail, EntityDocument {
}
declare class KeyDetail extends EMEntity implements IKeyDetail {
    serviceName: string;
    entityName: string;
    value: string;
}
export { EMEntityMultiKey, IEntityMultiKey, IEntityMultiKeyModel, KeyDetail, IKeyDetail, IKeyDetailModel };
