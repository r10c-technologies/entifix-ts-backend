import { EMEntityMetaOperationType } from './enumeration'
import { EntityMovementFlow } from '../../hc-core/hcEntity/hcEntity'

class EMEntityOperationMetadata 
{
    //#region Properties

    private _operationType: EMEntityMetaOperationType;
    private _operationMethod: EntityMovementFlow | Promise<EntityMovementFlow>;
    private _data: any;

    //#endregion

    //#region Methods

    constructor(operationType : EMEntityMetaOperationType, operationMethod : EntityMovementFlow | Promise<EntityMovementFlow>, data : any) 
    {
        this._operationType = operationType;
        this._operationMethod = operationMethod;
        this._data = data;
    }



    //#endregion

    //#region Accessors

    get operationType()
    { return this._operationType; }

    get operationMethod()
    { return this._operationMethod; }

    get data()
    { return this._data; }

    //#endregion

    
}

export {
    EMEntityOperationMetadata
}

