import amqp = require('amqplib/callback_api');
import { EMServiceSession } from '../../express-mongoose/emServiceSession/emServiceSession';
import { AMQPDelegate } from '../amqp-delegate/AMQPDelegate';
import { AMQPEvent } from '../amqp-event/AMQPEvent';
import { EMSession } from '../../express-mongoose/emSession/emSession';
interface ExchangeDescription {
    name: string;
    type: ExchangeType;
    durable: boolean;
}
declare enum ExchangeType {
    topic = "topic",
    fanout = "fanout",
    direct = "direct"
}
declare class AMQPEventManager {
    private _serviceSession;
    private _events;
    private _delegates;
    private _channels;
    private _exchangesDescription;
    constructor(serviceSession: EMServiceSession);
    registerEvent<TEvent extends AMQPEvent>(type: {
        new (session: AMQPEventManager): TEvent;
    }): TEvent;
    publish(eventName: string, data: any): void;
    publish(eventName: string, data: any, options: {
        session?: EMSession;
        entityName?: string;
        actionName?: string;
        entityId?: string;
    }): void;
    registerDelegate<TDelegate extends AMQPDelegate>(type: {
        new (session: AMQPEventManager): TDelegate;
    }): TDelegate;
    assertDelegateChannel(delegate: AMQPDelegate): Promise<amqp.Channel>;
    assertEventChannel(event: AMQPEvent): Promise<amqp.Channel>;
    createAnonymousChannel(): Promise<amqp.Channel>;
    private assertChannel;
    private verifyExchageDescription;
    defineExchange(exchangeDescription: ExchangeDescription): void;
    getExchangeDescription(exchangeName: any): ExchangeDescription;
    readonly serviceSession: EMServiceSession;
}
export { AMQPEventManager, ExchangeDescription, ExchangeType };