import amqp = require('amqplib/callback_api');

import { EMServiceSession } from '../../express-mongoose/emServiceSession/emServiceSession';
import { AMQPDelegate } from '../amqp-delegate/AMQPDelegate';
import { AMQPEvent } from '../amqp-event/AMQPEvent';
import { puts } from 'util';
import { AMQPEventMessage } from '../amqp-models/amqp-models';
import { AMQPSender } from '../amqp-sender/AMQPSender';
import { AMQPEventArgs } from '../amqp-event-args/AMQPEventArgs';
import { Options } from 'body-parser';


class AMQPEventManager
{
    //#region Properties
    
    private _serviceSession : EMServiceSession;

    private _publishers : Array<{ name: string, eventInstance : AMQPEvent }>;

    //#endregion

    //#region Methods

    constructor( serviceSession : EMServiceSession )
    {
        this._serviceSession = serviceSession;

        this._publishers = new Array<{name: string, eventInstance : AMQPEvent}>();
    }

    registerEvent( eventData : AMQPEvent | Array<AMQPEvent> ) : void
    {
        this._serviceSession.checkAMQPConnection();

        if ( eventData instanceof Array)
            eventData.forEach( e => this._publishers.push({ name: e.constructor.name, eventInstance: e }));
        else
            this._publishers.push({ name: eventData.constructor.name, eventInstance: eventData });
    }

    publish(eventName : string, data : any) : void
    {
        this._serviceSession.checkAMQPConnection();

        let pub = this._publishers.find( p => p.name == eventName);

        if (!pub)
            this._serviceSession.throwException(`No published register for the event: ${eventName}`);

        let amqpEventMessage = pub.eventInstance.constructMessage(this, data);
        let message = {
            sender: amqpEventMessage.sender.serialize(),
            eventArgs: amqpEventMessage.eventArgs.serialize()
        };

        this.getEventChannel(pub.eventInstance).publish(pub.eventInstance.exchangeName, pub.eventInstance.routingKey, new Buffer(JSON.stringify(message)) );
    }

    registerDelegate( delegateData: AMQPDelegate | Array<AMQPDelegate> ) : void
    {
        this._serviceSession.checkAMQPConnection();

        if (delegateData instanceof Array)
            delegateData.forEach( d => this.getDelegateChannel(d).consume(d.queueName, d.onMessage) );
        else
            this.getDelegateChannel(delegateData).consume(delegateData.queueName, delegateData.onMessage );
    }

    private getDelegateChannel( delegate : AMQPDelegate ) : amqp.Channel
    {
        let ch = this._serviceSession.brokerChannels.find( c => c.name == delegate.channelName );
        if (!ch)
            this._serviceSession.throwException(`Channel not found: ${delegate.channelName}`);
        return ch.channel;
    };

    private getEventChannel( event : AMQPEvent ) : amqp.Channel
    {
        let ch = this._serviceSession.brokerChannels.find( c => c.name == event.channelName );
        if (!ch)
            this._serviceSession.throwException(`Channel not found: ${event.channelName}`);
        return ch.channel; 
    }

    //#endregion

    //#region Accesors
    
    get serviceSession()
    { return this._serviceSession }

    //#endregion
}

export { AMQPEventManager }