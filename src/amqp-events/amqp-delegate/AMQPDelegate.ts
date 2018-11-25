
import amqp = require('amqplib/callback_api');

import { AMQPSender } from '../amqp-sender/AMQPSender';
import { AMQPEventArgs } from '../amqp-event-args/AMQPEventArgs';
import { AMQPEventManager } from '../amqp-event-manager/AMQPEventManager';

abstract class AMQPDelegate 
{
    //#region Properties

    private _eventManager : AMQPEventManager;
    private _queueOptions : amqp.Options.AssertQueue;

    //#endregion

    //#region Methods

    constructor( eventManager : AMQPEventManager )
    {
        this._eventManager = eventManager;
    }

    abstract execute( sender : AMQPSender, eventArgs : AMQPEventArgs ) : Promise<void>;

    onMessage( channel : amqp.Channel ) : ( message : amqp.Message) => any
    {
        return message => {
            let messageContent = JSON.parse(message.content.toString());
            let sender = new AMQPSender(messageContent);
            
            let eventArgs = new AMQPEventArgs(messageContent, { originalMessage: message, channel, serviceSession: this._eventManager.serviceSession });

            this.execute( sender, eventArgs );
        }        
    }

    //#endregion

    //#region Accessors

    get queueName () : string
    { return null; }

    get queueOptions () : amqp.Options.AssertQueue
    { return this._queueOptions; }

    get exchangeName () : string
    { return null; }
    
    get channelName () : string
    { return 'mainChannel' }

    get eventManager ()
    { return this._eventManager; }


    //#endregion

}


export { AMQPDelegate }


