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

    abstract onSaving() : void;
    abstract onDeleting() : void;

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

export { Entity }