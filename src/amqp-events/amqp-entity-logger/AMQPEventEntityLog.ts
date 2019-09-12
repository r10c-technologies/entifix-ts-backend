import amqp = require('amqplib/callback_api');

import { AMQPEvent } from '../amqp-event/AMQPEvent';
import { AMQPEventManager, ExchangeDescription } from '../amqp-event-manager/AMQPEventManager';
import { EntityEventLogType } from './AMQPEntityLogger';
import { EMEntity } from '../../express-mongoose/emEntity/emEntity';

class AMQPEventEntityLog extends AMQPEvent 
{
    //#region Properties

    private _exchangeDescription : ExchangeDescription;
    private _routingKey : string;
    private _specificQueue : string;
    private _name : string;
    private _chnnelNamel : string;
    private _logType : EntityEventLogType;

    //#endregion

    //#region Methods

    constructor( 
        eventManager : AMQPEventManager, 
        name : string,
        logType: EntityEventLogType,
        options : { specificQueue?: string, exchangeDescription? : ExchangeDescription, channelName? : string, routingKey? : string } ) 
    {
        super(eventManager);

        options = options || {};

        this._name = name;
        this._logType = logType;

        if (!options.specificQueue && !options.exchangeDescription)
            eventManager.serviceSession.throwException("It is necessary to define an Exchage Description or Specific Queue for the event: " + name );

        if (options.routingKey)
            this._routingKey = options.routingKey;
        
        this._chnnelNamel = options.channelName || 'entityLogEvents';
        this._specificQueue = options.specificQueue;
        this._exchangeDescription = options.exchangeDescription;
    } 


    protected onMessageConstruction( data : any ) : Promise<{ data : any, options? : amqp.Options.Publish}>
    {
        if (data instanceof EMEntity) 
            return new Promise<{ data : any, options? : amqp.Options.Publish}>( (resolve,reject) => {
                let entity = data as EMEntity;
                resolve({ data: entity.serializeExposedAccessors() });
            });
        else
            return null;
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
    
    get logType()
    { return this._logType; }

    //#endregion

}

export { AMQPEventEntityLog }
