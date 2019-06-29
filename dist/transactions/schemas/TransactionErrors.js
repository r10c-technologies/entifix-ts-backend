"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class BaseTransactionError {
    //#region Properties
    //#endregion
    //#region Methods
    constructor(_errorType, _transactionStage) {
        this._errorType = _errorType;
        this._transactionStage = _transactionStage;
    }
    //#endregion
    //#region Accessors
    get errorType() { return this._errorType; }
    set errorType(value) { this._errorType = value; }
    get transactionStage() { return this._transactionStage; }
    set transactionStage(value) { this._transactionStage = value; }
}
exports.BaseTransactionError = BaseTransactionError;
//# sourceMappingURL=TransactionErrors.js.map