import { AMQPSender } from '../../amqp-events/amqp-sender/AMQPSender';
import { AMQPEventArgs } from '../../amqp-events/amqp-event-args/AMQPEventArgs';
interface AMQPEventMessage {
    sender: AMQPSender;
    eventArgs: AMQPEventArgs;
}
export { AMQPEventMessage };
