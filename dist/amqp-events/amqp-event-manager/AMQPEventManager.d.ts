import { EMServiceSession } from '../../express-mongoose/emServiceSession/emServiceSession';
import { AMQPDelegate } from '../amqp-delegate/AMQPDelegate';
import { AMQPEvent } from '../amqp-event/AMQPEvent';
declare class AMQPEventManager {
    private _serviceSession;
    private _publishers;
    constructor(serviceSession: EMServiceSession);
    registerEvent(eventData: AMQPEvent | Array<AMQPEvent>): void;
    publish(eventName: string, data: any): void;
    registerDelegate(delegateData: AMQPDelegate | Array<AMQPDelegate>): void;
    private getDelegateChannel;
    private getEventChannel;
    readonly serviceSession: EMServiceSession;
}
export { AMQPEventManager };
