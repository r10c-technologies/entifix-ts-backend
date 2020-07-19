import { AMQPEvent } from "../amqp-event/AMQPEvent";
import { ExchangeDescription, AMQPEventManager } from "../amqp-event-manager/AMQPEventManager";



class AMQPCustomEvent extends AMQPEvent
{
    //#region Properties

    private _name: string;
    private _routingKey: string; 
    private _exchangeDescription : ExchangeDescription;
    private _options: { channelName? : string };

    //#endregion


    //#region Methods

    constructor (eventManager: AMQPEventManager, name: string, routingKey: string, exchangeDescription : ExchangeDescription);
    constructor (eventManager: AMQPEventManager, name: string, routingKey: string, exchangeDescription : ExchangeDescription, options: {channelName? : string});
    constructor (eventManager: AMQPEventManager, name: string, routingKey: string, exchangeDescription : ExchangeDescription, options?: {channelName? : string})
    {
        super(eventManager);

        this._name = name;
        this._routingKey = routingKey;
        this._exchangeDescription = exchangeDescription;
        this._options = options;
    }
    
    //#endregion


    //#region Accessors

    get channelName()
    { 
        if (this._options && this._options.channelName)
            return this._options.channelName;
        else
            return this._name + 'CustomEvent'; 
    }

    get routingKey() 
    { 
        return this._routingKey; 
    }

    get exchangeDescription ()
    { 
        return this._exchangeDescription;
    }

    get name() 
    {
        return this._name;
    }

    //#endregion
}


export {
    AMQPCustomEvent
}