import { Entity } from '../hcEntity/hcEntity';


abstract class HcSession
{
    //#region Properties (Fields)

    private _entitiesInfo : any[];
    
    //#endregion



    //#region Methods

    constructor ()
    {
        this._entitiesInfo = [];
    }

    abstract connect( ) : Promise<void>;
    
    protected addEntityInfo(entityInfo : any) : void
    {
        this.entitiesInfo.push(entityInfo);
    }

    //#endregion



    //#region Accessors (Properties)

    get entitiesInfo () : any[]
    {
        return this._entitiesInfo;
    }
    
    //#endregion
   
}

export { HcSession }  