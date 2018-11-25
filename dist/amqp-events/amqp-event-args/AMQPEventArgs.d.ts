import amqp = require('amqplib/callback_api');
declare class AMQPEventArgs {
    private _data;
    private _originalMessage;
    private _channel;
    constructor(messageContent?: any);
    serialize(): any;
    ackMessage(): void;
    data: any;
    originalMessage: amqp.Message;
    channel: amqp.Channel;
}
export { AMQPEventArgs };
