import { TransactionErrorType, TransactionStage } from "../schemas/TransactionEnums";
import { TransactionError } from "./TransactionError";
import { TransactionContext } from "./TransactionContext";

class TransactionManager
{
    //#region Properties

    private static _singleton : TransactionManager;

    //#endregion



    //#region Method


    private constructor() { }


    processError(context : TransactionContext, error : TransactionError) {

    }

    processException(context : TransactionContext,  exception : any ) {

    }

    txStart() : TransactionContext
    {
        return null;
    }

    txSubmit() : TransactionContext {
        return null;
    } 

    //#endregion





    //#region Accessors

    //#endregion



    //#region Static


    static initialize() {
        this._singleton = new TransactionManager();
    }

    static get singleton() {
        if (!this._singleton)
            throw new Error("Transaction Manager isn't initialized");

        return this._singleton;
    }

    
    //#endregion
}

export {  TransactionManager } 










