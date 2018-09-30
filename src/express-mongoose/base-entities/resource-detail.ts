import { EMEntity, EntityDocument, IBaseEntity } from '../emEntity/emEntity';
import { DefinedEntity, DefinedAccessor, ExpositionType  } from '../../hc-core/hcMetaData/hcMetaData';

interface IResourceDetail extends IBaseEntity
{
    resourceName: string,
    apiUrl: string
}

interface IResourceDetailModel extends EntityDocument, IResourceDetail { }

@DefinedEntity( )
class ResourceDetail extends EMEntity implements IResourceDetail
{
    //#region Properties (Fields)

    //#endregion


    //#region Methods

    //#endregion


    //#region Accessors (Properties)

    @DefinedAccessor({ exposition: ExpositionType.Normal, schema: { type: String, require: true } })
    get resourceName () : string
    { return (<IResourceDetailModel>this._document).resourceName; }
    set resourceName (value : string)
    { (<IResourceDetailModel>this._document).resourceName = value; }
    
    @DefinedAccessor({ exposition: ExpositionType.Normal, schema: { type: String, require: true}})
    get apiUrl () : string
    { return (<IResourceDetailModel>this._document).apiUrl; }
    set apiUrl (value : string)
    { (<IResourceDetailModel>this._document).apiUrl = value; }

    //#endregion
}

export { ResourceDetail, IResourceDetailModel, IResourceDetail };
