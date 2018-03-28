import { EMEntity, EntityDocument, IBaseEntity } from '../express-mongoose/emEntity/emEntity';
import { DefinedEntity, DefinedAccessor  } from '../hcMetaData/hcMetaData';

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

    @DefinedAccessor({ exposed: true, schema: { type: String, require: true } })
    get resourceName () : string
    { return (<IResourceDetailModel>this._document).resourceName; }
    set resourceName (value : string)
    { (<IResourceDetailModel>this._document).resourceName = value; }
    
    @DefinedAccessor({ exposed: true, schema: { type: String, require: true}})
    get apiUrl () : string
    { return (<IResourceDetailModel>this._document).apiUrl; }
    set apiUrl (value : string)
    { (<IResourceDetailModel>this._document).apiUrl = value; }

    //#endregion
}

export { ResourceDetail, IResourceDetailModel, IResourceDetail };
