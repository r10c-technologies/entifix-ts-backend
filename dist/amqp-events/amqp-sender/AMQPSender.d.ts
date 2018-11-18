declare class AMQPSender {
    protected _serviceName: string;
    protected _entityName: string;
    protected _actionName: string;
    constructor(messageContent: any);
    serialize(): any;
    serviceName: string;
    entityName: string;
    actionName: string;
}
export { AMQPSender };
