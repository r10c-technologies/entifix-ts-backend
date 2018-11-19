import { AMQPEventMessage } from '../amqp-models/amqp-models';
import { AMQPEventManager } from '../amqp-event-manager/AMQPEventManager';
import { AMQPSender } from '../amqp-sender/AMQPSender';
import { AMQPEventArgs } from '../amqp-event-args/AMQPEventArgs';

abstract class AMQPEvent 
{
    //#region Properties

    private _eventManager : AMQPEventManager;

    //#endregion

    //#region Methods

    abstract generate () : Promise<void>;

    constructMessage( eventManager : AMQPEventManager, data : any ) : AMQPEventMessage
    {
        let actionName = this.actionName;
        let entityName = this.entityName;
        let sender = new AMQPSender( {
            serviceName: eventManager.serviceSession.serviceName,
            actionName,
            entityName
        } );

        let eventArgs = new AMQPEventArgs( { 
            data
        } );

        return { sender, eventArgs };
    }


    //#endregion

    //#region Accessors

    abstract get exchangeName () : string;
    abstract get routingKey() : string;
    
    get entityName() : string
    { return null; }

    get actionName() : string
    { return null; }

    get channelName () : string
    { return 'mainChannel' }

    //#endregion

}

export { AMQPEvent }


