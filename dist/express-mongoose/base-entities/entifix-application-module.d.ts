import { IBaseEntity, EntityDocument, EMEntity } from '../emEntity/emEntity';
interface IEntifixApplicationModule extends IBaseEntity {
    name: string;
    url: string;
    displayName: string;
    resources: Array<EntifixResource>;
}
interface IEntifixApplicationModuleModel extends EntityDocument, IEntifixApplicationModule {
}
interface EntifixResource {
    entityName: string;
    resourceName: string;
    basePath: string;
}
declare class EntifixApplicationModule extends EMEntity implements IEntifixApplicationModule {
    name: string;
    url: string;
    displayName: string;
    resources: Array<EntifixResource>;
}
export { EntifixResource, IEntifixApplicationModule, IEntifixApplicationModuleModel, EntifixApplicationModule };
