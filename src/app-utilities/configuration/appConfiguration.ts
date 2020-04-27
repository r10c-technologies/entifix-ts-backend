import { 
    EMEntity, 
    EntityDocument, 
    IBaseEntity
} from "../../express-mongoose/emEntity/emEntity";

import { DefinedAccessor, ExpositionType, DefinedEntity } from "../../hc-core/hcMetaData/hcMetaData";

interface IAppConfiguration extends IBaseEntity 
{
    name : string;
    value : any;
    description : string;
    group: string;
    userManagement: boolean;
    display : string;
}


interface IAppConfigurationModel extends EntityDocument, IAppConfiguration { }


@DefinedEntity({ packageName: 'CORE' })
class AppConfiguration extends EMEntity implements IAppConfiguration
{
    //#region Properties

    //#endregion

    //#region Methods


    //#endregion

    //#region Accessors

    get _id()
    {
        if (this.isNew)
            return this.name;
        else
            return super._id;
    }

    @DefinedAccessor({ exposition: ExpositionType.ReadOnly, schema: { type: String} })
    get name(): string 
    { return (this._document as IAppConfigurationModel).name; }
    set name(value: string)
    { (this._document as IAppConfigurationModel).name = value; }

    @DefinedAccessor({ exposition: ExpositionType.Normal, schema: { type: Object } })
    get value(): any 
    { return (this._document as IAppConfigurationModel).value; }
    set value(v: any)
    { (this._document as IAppConfigurationModel).value = v; }

    @DefinedAccessor({ exposition: ExpositionType.Normal, schema: { type: String} })
    get description(): string 
    { return (this._document as IAppConfigurationModel).description; }
    set description(value: string)
    { (this._document as IAppConfigurationModel).description = value; }

    @DefinedAccessor({ exposition: ExpositionType.Normal, schema: { type: String} })
    get group(): string 
    { return (this._document as IAppConfigurationModel).group; }
    set group(value: string)
    { (this._document as IAppConfigurationModel).group = value; }

    @DefinedAccessor({ exposition: ExpositionType.Normal, schema: { type: Boolean} })
    get userManagement(): boolean 
    { return (this._document as IAppConfigurationModel).userManagement; }
    set userManagement(value: boolean)
    { (this._document as IAppConfigurationModel).userManagement = value; }

    @DefinedAccessor({ exposition: ExpositionType.Normal, schema: { type: String} })
    get display(): string 
    { return (this._document as IAppConfigurationModel).display; }
    set display(value: string)
    { (this._document as IAppConfigurationModel).display = value; }


    setName(name : string) {
        this.name = name;
        return this;
    }

    setValue(value : any) {
        this.value = value;
        return this;
    }

    setDescription(description : any) {
        this.description = description;
        return this;
    }
    
    setGroup(group : string) {
        this.group = group;
        return this;
    }

    setDisplay(display : string) {
        this.display = display;
        return this;
    }

    setUserManagement(userManagement : boolean) {
        this.userManagement = userManagement;
        return this;
    }



    //#endregion
}

export {
    AppConfiguration,
    IAppConfigurationModel
}