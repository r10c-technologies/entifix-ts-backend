import amqp = require('amqplib/callback_api');
import { AMQPEventMessage } from '../amqp-models/amqp-models';
import { AMQPEventManager, ExchangeDescription } from '../amqp-event-manager/AMQPEventManager';
import { EMSession } from '../../express-mongoose/emSession/emSession';
interface EventMovementFlow {
    continue: boolean;
    data?: any;
}
declare abstract class AMQPEvent {
    private _eventManager;
    constructor(eventManager: AMQPEventManager);
    protected onMessageConstruction(data: any): Promise<{
        data: any;
        options?: amqp.Options.Publish;
    }>;
    constructMessage(data: any): Promise<AMQPEventMessage>;
    constructMessage(data: any, options: {
        session?: EMSession;
        entityName?: string;
        actionName?: string;
        entityId?: string;
    }): Promise<AMQPEventMessage>;
    readonly exchangeDescription: ExchangeDescription;
    readonly routingKey: string;
    readonly specificQueue: string;
    readonly channelName: string;
    readonly eventManager: AMQPEventManager;
}
export { AMQPEvent, EventMovementFlow };
