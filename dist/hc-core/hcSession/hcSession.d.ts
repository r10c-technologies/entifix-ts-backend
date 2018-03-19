declare abstract class HcSession {
    private _entitiesInfo;
    constructor();
    abstract connect(url: string, success?: () => void, error?: (err) => void): void;
    protected addEntityInfo(entityInfo: any): void;
    readonly entitiesInfo: any[];
}
export { HcSession };
