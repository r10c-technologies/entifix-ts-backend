import amqp = require('amqplib/callback_api');
import { EMServiceSession } from '../../express-mongoose/emServiceSession/emServiceSession';
import { EMSession } from '../../express-mongoose/emSession/emSession';
declare class AMQPEventArgs {
    private _data;
    private _originalMessage;
    private _channel;
    private _session;
    constructor(messageContent: any);
    constructor(messageContent: any, options: {
        channel?: amqp.Channel;
        serviceSession?: EMServiceSession;
        originalMessage?: amqp.Message;
    });
    serialize(): any;
    ackMessage(): void;
    readonly data: any;
    readonly originalMessage: amqp.Message;
    readonly channel: amqp.Channel;
    readonly session: EMSession;
}
export { AMQPEventArgs };
