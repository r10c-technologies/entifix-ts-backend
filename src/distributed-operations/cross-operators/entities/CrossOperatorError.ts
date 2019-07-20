import { CrossOperationErrorType } from '../schemas/CrossEnums';


class CrossOperatorError 
{
    //#region Properties


    //#endregion



    //#region Methods

    constructor ( private _message : string, private _details : any )
    {

    }

    //#endregion


    //#region Accessors

    // get errorType()
    // { return this._errorType; }

    get message()
    { return this._message; }

    get details()
    { return this._details; }

    //#endregion
}

export { CrossOperatorError }