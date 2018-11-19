
import amqp = require('amqplib/callback_api');

import { AMQPSender } from '../amqp-sender/AMQPSender';
import { AMQPEventArgs } from '../amqp-event-args/AMQPEventArgs';

abstract class AMQPDelegate 
{
    //#region Properties

    //#endregion

    //#region Methods

    constructor( )
    {

    }

    abstract execute( sender : AMQPSender, eventArgs : AMQPEventArgs) : Promise<void>;

    onMessage( message : amqp.Message ) : void
    {
        let messageContent = JSON.parse(message.content.toString());
        let sender = new AMQPSender(messageContent);
        let eventArgs = new AMQPEventArgs(messageContent);
        this.execute( sender, eventArgs );
    }

    //#endregion

    //#region Accessors

    abstract get queueName () : string;
    abstract get exchangeName () : string;
    
    get channelName () : string
    { return 'mainChannel' }

    //#endregion

}


export { AMQPDelegate }


