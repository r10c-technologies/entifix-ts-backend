import { EMEntityMetaOperationType } from './enumeration'
import { EntityMovementFlow } from '../../hc-core/hcEntity/hcEntity'
import { EMEntity } from '../../express-mongoose/emEntity/emEntity';

class EMEntityOperationMetadata 
{
    //#region Properties

    private _operationTypes: Array<EMEntityMetaOperationType>;
    private _operationMethod: (entity : EMEntity) => EntityMovementFlow | Promise<EntityMovementFlow>;
    private _data: any;

    //#endregion

    //#region Methods

    constructor() { }


    addOperationType(operationType : EMEntityMetaOperationType | Array<EMEntityMetaOperationType>) : void 
    {
        if (operationType) {
            if (!this._operationTypes)
                this._operationTypes = new Array<EMEntityMetaOperationType>();

            if (operationType instanceof Array)
                this._operationTypes = this._operationTypes.concat(operationType);
            else
                this._operationTypes.push(operationType);
        }
    }

    applyForOperation(operationType : EMEntityMetaOperationType) : boolean
    {
        if (!this._operationTypes)
            return false;

        return this._operationTypes.find( ot => ot == operationType) != null;
    }



    //#endregion

    //#region Accessors

    get operationTypes()
    { return this._operationTypes; }
    set operationTypes(value)
    { this._operationTypes = value; }

    get operationMethod()
    { return this._operationMethod; }
    set operationMethod(value)
    { this._operationMethod = value; }

    get data()
    { return this._data; }
    set data(value)
    { this._data = value; }

    //#endregion

    
}

export {
    EMEntityOperationMetadata
}

