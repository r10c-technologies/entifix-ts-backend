declare class AMQPEventArgs {
    protected _data: any;
    constructor(messageContent: any);
    serialize(): any;
    data: any;
}
export { AMQPEventArgs };
