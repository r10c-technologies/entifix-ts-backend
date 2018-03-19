"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class EMQueryWrapper {
    //#endregion
    //#region Methods
    constructor(isError, message, resultData) {
        this._isError = isError;
        this._message = message;
        this._resultData = resultData;
    }
    //#endregion
    //#region Accessors (Properties)
    get isError() { return this._isError; }
    set isError(value) { this._isError = value; }
    get message() { return this._message; }
    set message(value) { this._message = value; }
    get resultData() { return this._resultData; }
    set resultData(value) { this._resultData = value; }
}
exports.EMQueryWrapper = EMQueryWrapper;
//# sourceMappingURL=emUtilities.js.map