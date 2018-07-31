import { EntityInfo, IMetaDataInfo, DefinedEntity } from '../hcMetaData/hcMetaData';

@DefinedEntity( { packageName: 'CORE', abstract: true })
abstract class Entity implements IMetaDataInfo
{
    //#region Properties (Fields)
    
    entityInfo : EntityInfo;

    //#endregion



    //#region Methods

    constructor()
    {
        
    }

    abstract save() : Promise<EntityMovementFlow>;
    abstract delete() : Promise<EntityMovementFlow>;
    protected abstract onSaving() : Promise<EntityMovementFlow>;
    protected abstract onDeleting() : Promise<EntityMovementFlow>;
    protected abstract onDeleted() : void;
    protected abstract onSaved() : void;

    serializeExposedAccessors () : any
    {
        var simpleObject : any = {};
        
        this.entityInfo.getExposedAccessors().forEach( accessor => {
            simpleObject[accessor.name] = this[accessor.name];
        });

        return simpleObject;
    }

    static getInfo() : EntityInfo
    {
        return this.prototype.entityInfo;
    }

    //#endregion



    //#region Accessors

    //#endregion
} 

interface EntityMovementFlow {
    continue: boolean; 
    message? : string; 
    details? : any;
}

export { EntityMovementFlow, Entity }