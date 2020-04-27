import { DefinedEntity, DefinedAccessor, MemberActivator, MemberBindingType, ExpositionType, EntityInfo } from '../../hc-core/hcMetaData/hcMetaData';
import { EntityDocument, EMEntity } from "../emEntity/emEntity";
import { EMMemberActivator } from '../emMetadata/emMetadata';

interface IEntityKey
{
    serviceName : string,
    entityName : string,
    value : string,
}
interface IEntityKeyModel extends IEntityKey, EntityDocument { }

@DefinedEntity( { packageName: 'CORE' } )
class EntityKey extends EMEntity implements IEntityKey
{
    //#region Properties

    //#endregion

    //#region Methods


    //#endregion

    //#region Accessors

    @DefinedAccessor( { exposition: ExpositionType.Normal, schema: { type: String, required: true } } )
    get serviceName() : string
    { return (this._document as IEntityKeyModel).serviceName; }
    set serviceName( value : string )
    { (this._document as IEntityKeyModel).serviceName = value; }

    @DefinedAccessor( { exposition: ExpositionType.Normal, schema: { type: String, required: true } } )
    get entityName() : string
    { return (this._document as IEntityKeyModel).entityName; }
    set entityName( value : string )
    { (this._document as IEntityKeyModel).entityName = value; }

    @DefinedAccessor( { exposition: ExpositionType.Normal, schema: { type: String, required: true } } )
    get value() : string
    { return (this._document as IEntityKeyModel).value; }
    set value( value : string )
    { (this._document as IEntityKeyModel).value = value; }

    //#endregion
}


interface IEntityMultiKey 
{
    alternativeKeys: Array<IEntityKey>;
}
interface IEntityMultiKeyModel extends IEntityMultiKey, EntityDocument { }

@DefinedEntity( { packageName: 'CORE', abstract: true })
class EMEntityMultiKey extends EMEntity implements IEntityMultiKey
{
    //#region Properties

    private _alternativeKeys : Array<EntityKey>;

    //#endregion

    //#region Methods

    static isMultiKeyEntity( entityInfo : EntityInfo)
    {
        let base = entityInfo.base;
        let isMultiKeyEntity = base ? base.name == 'EMEntityMultiKey' : false;

        while ( base != null && !isMultiKeyEntity)
        {
            isMultiKeyEntity = base.name == 'EMEntityMultiKey';
            base = base.base;
        }

        return isMultiKeyEntity;
    }

    addKey( singleKey : IEntityKey ) : void 
    {
        if (this.alternativeKeys == null)
            this.alternativeKeys = new Array<EntityKey>();
        
        if (this.alternativeKeys.find( k => k.serviceName == singleKey.serviceName && k.entityName == singleKey.entityName && k.value == singleKey.value))
            return;        

        if (singleKey instanceof EntityKey) {
            this.alternativeKeys.push(singleKey);
            return;
        }

        let instancedKey = new EntityKey(this.session);
        instancedKey.serviceName = singleKey.serviceName;
        instancedKey.entityName = singleKey.entityName;
        instancedKey.value = singleKey.value;
        this.alternativeKeys.push(instancedKey);
    }

    //#endregion

    //#region Accessors

    @DefinedAccessor( { 
        exposition: ExpositionType.Normal, 
        schema: { type : Array }, 
        activator: new EMMemberActivator<EntityKey, IEntityKeyModel>(EntityKey.getInfo(), MemberBindingType.Snapshot, true, { includeDuringSerialization: 'completeEntity'})     
    })
    get alternativeKeys() : Array<EntityKey>
    { return this._alternativeKeys; }
    set alternativeKeys( value:Array<EntityKey> )
    { this._alternativeKeys = value; (this._document as IEntityMultiKeyModel).alternativeKeys = value ? value.map( v => v.getDocument() as IEntityKeyModel ) : null; }

    //#endregion
}

export { 
    EMEntityMultiKey, 
    IEntityMultiKey, 
    IEntityMultiKeyModel, 
    EntityKey, 
    IEntityKey, 
    IEntityKeyModel 
}

