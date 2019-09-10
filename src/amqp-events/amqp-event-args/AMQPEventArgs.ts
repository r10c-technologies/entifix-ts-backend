import amqp = require('amqplib/callback_api');

import { EMServiceSession } from '../../express-mongoose/emServiceSession/emServiceSession';
import { EMSession } from '../../express-mongoose/emSession/emSession';

class AMQPEventArgs 
{
    //#region Properties

    private _data : any;
    private _originalMessage : amqp.Message;
    private _channel : amqp.Channel;
    private _session : EMSession;

    //#endregion

    //#region Methods

    constructor( messageContent : any);
    constructor( messageContent : any, options: { channel? : amqp.Channel, serviceSession?: EMServiceSession, originalMessage? : amqp.Message } );
    constructor( messageContent : any, options?: { channel? : amqp.Channel, serviceSession?: EMServiceSession, originalMessage? : amqp.Message } )
    {
        if (messageContent && messageContent.eventArgs)
            this._data = messageContent.eventArgs.data;

        if (messageContent && messageContent.sender && messageContent.sender.privateUserData && options && options.serviceSession)
            this._session = new EMSession( options.serviceSession, { privateUserData: messageContent.sender.privateUserData } );

        if (options)
        {
            this._channel = options.channel;
            this._originalMessage = options.originalMessage;
        }
    }

    
    serialize() : any
    {
        return {
            data: this._data
        };
    }

    ackMessage() : void
    {
        if (this.channel && this._originalMessage )
            this._channel.ack( this._originalMessage );
    }

    //#endregion

    //#region Accessors

    get data ()
    { return this._data; }
    
    get originalMessage() 
    { return this._originalMessage; }
    
    get channel()
    { return this._channel; }
    
    get session()
    { return this._session; }

    //#endregion

}


export { AMQPEventArgs }


