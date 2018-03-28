import { EMEntity, EntityDocument, IBaseEntity } from '../express-mongoose/emEntity/emEntity';
interface IResourceDetail extends IBaseEntity {
    resourceName: string;
    apiUrl: string;
}
interface IResourceDetailModel extends EntityDocument, IResourceDetail {
}
declare class ResourceDetail extends EMEntity implements IResourceDetail {
    resourceName: string;
    apiUrl: string;
}
export { ResourceDetail, IResourceDetailModel, IResourceDetail };
