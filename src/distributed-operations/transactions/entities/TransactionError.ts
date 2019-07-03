
import { TransactionStage, TransactionErrorType } from '../schemas/TransactionEnums';

class TransactionError 
{
    //#region Properties
    
    
    //#endregion

    //#region Methods

    constructor( private _errorType : TransactionErrorType, private _transactionStage: TransactionStage, private _message : String, private  _details : any )
    {

    }


    

    //#endregion

    //#region Accessors

    get errorType()
    { return this._errorType; }
    
    get transactionStage()
    { return this._transactionStage; }
    
    get message()
    { return this._message;}

    get details()
    { return this._details; }

    //#endregion
}


export { TransactionError }