
import { TransactionStage, ErrorType } from './TransactionEnums';

class BaseTransactionError 
{
    //#region Properties
    
    
    //#endregion

    //#region Methods

    constructor( private _errorType : ErrorType, private _transactionStage: TransactionStage )
    {

    }

    //#endregion

    //#region Accessors

    

    get errorType()
    { return this._errorType; }
    set errorType( value )
    { this._errorType = value; }

    get transactionStage()
    { return this._transactionStage; }
    set transactionStage( value )
    { this._transactionStage = value; }


    //#endregion
}


export { BaseTransactionError }