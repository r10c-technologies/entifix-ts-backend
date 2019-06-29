
class TXResultHandler 
{
    //#region Properties

    private static _singleton : TXResultHandler;

    //#endregion



    //#region Method


    requiredData () : void 
    {

    }




    //#endregion



    //#region Accessors

    //#endregion



    //#region Static


    static initialize() {
        this._singleton = new TXResultHandler();
    }

    static get singleton() {
        if (!this._singleton)
            throw new Error("Transaction result handler isn't initialized");

        return this._singleton;
    }

    
    //#endregion
}

export {  TXResultHandler } 










