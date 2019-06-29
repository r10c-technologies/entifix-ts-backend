"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class TransactionResultHandler {
    //#endregion
    //#region Method
    requiredData() {
    }
    //#endregion
    //#region Accessors
    //#endregion
    //#region Static
    static initialize() {
        this._singleton = new TransactionResultHandler();
    }
    static get singleton() {
        if (!this._singleton)
            throw new Error("Transaction result handler isn't initialized");
        return this._singleton;
    }
}
exports.TransactionResultHandler = TransactionResultHandler;
//# sourceMappingURL=TransactionResultHandler.js.map