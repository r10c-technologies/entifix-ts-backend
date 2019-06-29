"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class TXResultHandler {
    //#endregion
    //#region Method
    requiredData() {
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
}
exports.TXResultHandler = TXResultHandler;
//# sourceMappingURL=txResultHandler.js.map