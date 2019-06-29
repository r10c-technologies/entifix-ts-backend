declare class TXResultHandler {
    private static _singleton;
    requiredData(): void;
    static initialize(): void;
    static readonly singleton: TXResultHandler;
}
export { TXResultHandler };
