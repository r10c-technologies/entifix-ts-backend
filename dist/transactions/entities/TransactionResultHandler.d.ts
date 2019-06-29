declare class TransactionResultHandler {
    private static _singleton;
    requiredData(): void;
    static initialize(): void;
    static readonly singleton: TransactionResultHandler;
}
export { TransactionResultHandler };
