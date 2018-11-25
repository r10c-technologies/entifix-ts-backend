import amqp = require('amqplib/callback_api');
declare class AMQPSender {
    private _serviceName;
    private _entityName;
    private _actionName;
    private _publishOptions;
    constructor(messageContent?: any);
    serialize(): any;
    serviceName: string;
    entityName: string;
    actionName: string;
    publishOptions: amqp.Options.Publish;
}
export { AMQPSender };
