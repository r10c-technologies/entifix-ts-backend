import { DefinedEntity, DefinedAccessor, MemberActivator, MemberBindingType, ExpositionType } from '../../hc-core/hcMetaData/hcMetaData';
import { EntityDocument, EMEntity } from "../emEntity/emEntity";
import { EMMemberActivator } from '../emMetadata/emMetadata';





interface IEntityMultiKey 
{
    keys: Array<IKeyDetail>;
}
interface IEntityMultiKeyModel extends IEntityMultiKey, EntityDocument { }

@DefinedEntity( { packageName: 'CORE', abstract: true })
class EMEntityMultiKey extends EMEntity implements IEntityMultiKey
{
    //#region Properties

    //#endregion

    //#region Methods

    //#endregion

    //#region Accessors

    private _keys : Array<KeyDetail>;

    @DefinedAccessor( { exposition: ExpositionType.Normal, schema: { type : Array }, activator: new EMMemberActivator<KeyDetail, IKeyDetailModel>(KeyDetail.getInfo(),MemberBindingType.Snapshot,true)})
    get keys() : Array<KeyDetail>
    { return this._keys; }
    set keys( value:Array<KeyDetail> )
    { this._keys = value; (this._document as IEntityMultiKeyModel).keys = value ? value.map( v => v.getDocument() as IKeyDetailModel ) : null; }

    //#endregion
}





interface IKeyDetail
{
    serviceName : string,
    entityName : string,
    value : string,
}
interface IKeyDetailModel extends IKeyDetail, EntityDocument { }

@DefinedEntity( { packageName: 'CORE' } )
class KeyDetail extends EMEntity implements IKeyDetail
{
    //#region Properties

    //#endregion

    //#region Methods

    //#endregion

    //#region Accessors

    @DefinedAccessor( { exposition: ExpositionType.Normal, schema: { type: String, required: true } } )
    get serviceName() : string
    { return (this._document as IKeyDetailModel).serviceName; }
    set serviceName( value : string )
    { (this._document as IKeyDetailModel).serviceName = value; }

    @DefinedAccessor( { exposition: ExpositionType.Normal, schema: { type: String, required: true } } )
    get entityName() : string
    { return (this._document as IKeyDetailModel).entityName; }
    set entityName( value : string )
    { (this._document as IKeyDetailModel).entityName = value; }

    @DefinedAccessor( { exposition: ExpositionType.Normal, schema: { type: String, required: true } } )
    get value() : string
    { return (this._document as IKeyDetailModel).value; }
    set value( value : string )
    { (this._document as IKeyDetailModel).value = value; }

    //#endregion
}


export { EMEntityMultiKey, IEntityMultiKey, IEntityMultiKeyModel, KeyDetail, IKeyDetail, IKeyDetailModel }

