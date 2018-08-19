declare abstract class HcSession {
    private _entitiesInfo;
    constructor();
    abstract connect(): Promise<void>;
    protected addEntityInfo(entityInfo: any): void;
    readonly entitiesInfo: any[];
}
export { HcSession };
