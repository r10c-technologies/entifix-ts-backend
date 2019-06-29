import { TransactionStage, ErrorType } from './TransactionEnums';
declare class BaseTransactionError {
    private _errorType;
    private _transactionStage;
    constructor(_errorType: ErrorType, _transactionStage: TransactionStage);
    errorType: ErrorType;
    transactionStage: TransactionStage;
}
export { BaseTransactionError };
