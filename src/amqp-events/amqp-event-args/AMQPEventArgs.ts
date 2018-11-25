import amqp = require('amqplib/callback_api');

class AMQPEventArgs 
{
    //#region Properties

    private _data : any;
    private _originalMessage : amqp.Message;
    private _channel : amqp.Channel;

    //#endregion

    //#region Methods

    constructor( messageContent? : any)
    {
        if (messageContent && messageContent.eventArgs)
            this._data = messageContent.eventArgs.data;
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
    set data ( value )
    { this._data = value; }

    get originalMessage()
    { return this._originalMessage; }
    set originalMessage( value )
    { this._originalMessage = value; }

    get channel()
    { return this._channel; }
    set channel( value )
    { this._channel = value; } 

    //#endregion

}


export { AMQPEventArgs }


