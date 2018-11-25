import amqp = require('amqplib/callback_api');
import { EMServiceSession } from '../../express-mongoose/emServiceSession/emServiceSession';
import { AMQPDelegate } from '../amqp-delegate/AMQPDelegate';
import { AMQPEvent } from '../amqp-event/AMQPEvent';
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
    registerDelegate<TDelegate extends AMQPDelegate>(type: {
        new (session: AMQPEventManager): TDelegate;
    }): TDelegate;
    assertDelegateChannel(delegate: AMQPDelegate): Promise<amqp.Channel>;
    assertEventChannel(event: AMQPEvent): Promise<amqp.Channel>;
    createAnonymousChannel(): Promise<amqp.Channel>;
    private assertChannel;
    readonly serviceSession: EMServiceSession;
}
export { AMQPEventManager };
