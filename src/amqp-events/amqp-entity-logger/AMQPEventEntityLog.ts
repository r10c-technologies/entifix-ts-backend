
import { AMQPEvent } from '../amqp-event/AMQPEvent';
import { AMQPEventManager, ExchangeDescription } from '../amqp-event-manager/AMQPEventManager';
import { EntityEventLogType } from './AMQPEntityLogger';

class AMQPEventEntityLog extends AMQPEvent 
{
    //#region Properties

    private _exchangeDescription : ExchangeDescription;
    private _routingKey : string;
    private _specificQueue : string;
    private _name : string;
    private _chnnelNamel : string;

    //#endregion

    //#region Methods

    constructor( 
        eventManager : AMQPEventManager, 
        name : string,
        routingKey : string,
        options : { specificQueue?: string, exchangeDescription? : ExchangeDescription, channelName? : string } ) 
    {
        super(eventManager);

        options = options || {};

        this._name = name;
        this._routingKey = routingKey;
        
        if (!options.specificQueue && !options.exchangeDescription)
            eventManager.serviceSession.throwException("It is necessary to define an Exchage Description or Specific Queue for the event: " + name );

        this._chnnelNamel = options.channelName || 'entityLogEvents';
        this._specificQueue = options.specificQueue;
        this._exchangeDescription = options.exchangeDescription;
    } 

    //#endregion

    //#region Accessors

    get exchangeDescription() : ExchangeDescription
    { return this._exchangeDescription; }
    
    get routingKey() : string
    { return this._routingKey; }
    
    get specificQueue() : string
    { return this._specificQueue; }
    
    get channelName() : string
    { return this._chnnelNamel; }
    
    get name() 
    { return this._name; }
    
    get eventManager () 
    { return this.eventManager; }

    //#endregion

}

export { AMQPEventEntityLog }
