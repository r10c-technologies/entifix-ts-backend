import amqp = require('amqplib/callback_api');

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

    constructor(eventManager : AMQPEventManager) 
    {
        this._eventManager = eventManager;
    }

    protected onMessageConstruciton(data : any) : Promise<{ data : any, options? : amqp.Options.Publish}>
    {
        return null;
    }
    
    constructMessage( data : any ) : Promise<AMQPEventMessage>
    {
        return new Promise<AMQPEventMessage>( (resolve,reject)=>{
            let resolvePromise = (data, options?) => {
                let sender = new AMQPSender();
                sender.serviceName = this.eventManager.serviceSession.serviceName;
                sender.actionName = this.actionName;
                sender.entityName = this.entityName;
                sender.publishOptions = options;

                let eventArgs = new AMQPEventArgs();
                eventArgs.data = data;

                resolve({ sender, eventArgs});
            };

            let onConstructionTask = this.onMessageConstruciton(data);
            if (onConstructionTask)
                onConstructionTask.then( result => resolvePromise(result.data, result.options)).catch( err => reject(err));
            else
                resolvePromise(data);
        });
    }

    //#endregion

    //#region Accessors

    get exchangeName () : string
    { return null; }
    
    get routingKey() : string
    { return null; }

    get specificQueue() : string
    { return null; }

    get entityName() : string
    { return null; }

    get actionName() : string
    { return null; }

    get channelName () : string
    { return 'mainChannel' }

    get eventManager () 
    { return this._eventManager; }

    //#endregion

}

export { AMQPEvent }


