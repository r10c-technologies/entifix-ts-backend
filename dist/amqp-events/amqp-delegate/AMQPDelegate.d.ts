import amqp = require('amqplib/callback_api');
import { AMQPSender } from '../amqp-sender/AMQPSender';
import { AMQPEventArgs } from '../amqp-event-args/AMQPEventArgs';
declare abstract class AMQPDelegate {
    constructor();
    abstract execute(sender: AMQPSender, eventArgs: AMQPEventArgs): Promise<void>;
    onMessage(message: amqp.Message): void;
    abstract readonly queueName: string;
    abstract readonly exchangeName: string;
    readonly channelName: string;
}
export { AMQPDelegate };
