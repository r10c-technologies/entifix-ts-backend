import { AMQPEventMessage } from '../amqp-models/amqp-models';
import { AMQPEventManager } from '../amqp-event-manager/AMQPEventManager';
declare abstract class AMQPEvent {
    private _eventManager;
    abstract generate(): Promise<void>;
    constructMessage(eventManager: AMQPEventManager, data: any): AMQPEventMessage;
    abstract readonly exchangeName: string;
    abstract readonly routingKey: string;
    readonly entityName: string;
    readonly actionName: string;
    readonly channelName: string;
}
export { AMQPEvent };
