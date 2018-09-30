import { IBaseEntity, EntityDocument, EMEntity } from '../emEntity/emEntity';
import { DefinedEntity, DefinedAccessor, ExpositionType } from '../../hc-core/hcMetaData/hcMetaData';

interface IEntifixApplicationModule extends IBaseEntity
{
    name: string,
    url: string,
    displayName: string,
    resources: Array<EntifixResource>
}

interface IEntifixApplicationModuleModel extends EntityDocument, IEntifixApplicationModule { }

interface EntifixResource {
    entityName : string, 
    resourceName : string, 
    basePath : string
}

@DefinedEntity({ packageName: 'CORE' })
class EntifixApplicationModule extends EMEntity implements IEntifixApplicationModule
{
    //#region Properties

    //#endregion

    //#region Methods

    //#endregion

    //#region Accessors

    @DefinedAccessor({ exposition: ExpositionType.Normal, schema: { type: String, required: true }})
    get name() : string
    { return (<IEntifixApplicationModuleModel>this._document).name; }
    set name(value: string)
    { (<IEntifixApplicationModuleModel>this._document).name = value; }

    @DefinedAccessor({ exposition: ExpositionType.Normal, schema: { type: String }})
    get url() : string
    { return (<IEntifixApplicationModuleModel>this._document).url; }
    set url(value: string)
    { (<IEntifixApplicationModuleModel>this._document).url = value; }

    @DefinedAccessor({ exposition: ExpositionType.Normal, schema: { type: String }})
    get displayName() : string
    { return (<IEntifixApplicationModuleModel>this._document).displayName; }
    set displayName(value: string)
    { (<IEntifixApplicationModuleModel>this._document).displayName = value; }

    @DefinedAccessor({ exposition: ExpositionType.Normal, schema: { type: Array }})
    get resources() : Array<EntifixResource>
    { return (<IEntifixApplicationModuleModel>this._document).resources; }
    set resources(value: Array<EntifixResource>)
    { (<IEntifixApplicationModuleModel>this._document).resources = value; }

    //#endregion
}

export { EntifixResource, IEntifixApplicationModule, IEntifixApplicationModuleModel, EntifixApplicationModule }

