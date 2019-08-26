
import { EntityInfo } from '../../hc-core/hcMetaData/hcMetaData';
import { EMEntity } from '../../express-mongoose/emEntity/emEntity';
import { AMQPEvent } from '../amqp-event/AMQPEvent';
import { getEntityLogger } from './AMQPEntityLoggerMetadata';
import { AMQPEventEntityLog } from './AMQPEventEntityLog';
import { AMQPEventManager, ExchangeType } from '../amqp-event-manager/AMQPEventManager';
import { ExchangeDescription } from '../amqp-event-manager/AMQPEventManager';


class AMQPEntityLogger 
{
    //#region Properties

    private _entityInfo : EntityInfo;
    private _eventInstances : Array<{ logType: EntityEventLogType, instance : AMQPEvent }>;
    private _entityName : string;

    private _routingName;

    //#endregion



    //#region Methods


    constructor( entityNayme : string, options? : { routingName?: string }) {

        this._entityName = entityNayme;

        if (options)
            this._routingName = options.routingName;
    }

    protected createRoutingKey(logType : EntityEventLogType) : string {
        let rtName = this._routingName || this._entityInfo.name.toLowerCase();
        return 'entity.' + rtName + '.' + logType;
    }

    protected createExchangeDescription() : ExchangeDescription {
        return {
            name: 'entity_events',
            type: ExchangeType.topic,
            options: { durable: true }  
        };
    }

    protected createEventInstance(eventManager : AMQPEventManager, logType : EntityEventLogType) : AMQPEventEntityLog {
        let routingKey = this.createRoutingKey(logType); 
        return new AMQPEventEntityLog(
            eventManager,
            'logger-' + routingKey,
            routingKey,
            { exchangeDescription: this.createExchangeDescription() } 
        );        
    }

    protected createEventInstances( eventManager : AMQPEventManager ) : void
    {
        this._entityInfo = eventManager.serviceSession.getInfo(this._entityName);
        this._eventInstances = new  Array<{ logType: EntityEventLogType, instance : AMQPEvent }>();

        this._eventInstances.push({ logType: EntityEventLogType.created, instance: this.createEventInstance(eventManager, EntityEventLogType.created) });
        this._eventInstances.push({ logType: EntityEventLogType.updated, instance: this.createEventInstance(eventManager, EntityEventLogType.updated) });
        this._eventInstances.push({ logType: EntityEventLogType.deleted, instance: this.createEventInstance(eventManager, EntityEventLogType.deleted) });
    }

    //#endregion


    //#region Accessors

    get entityInfo() 
    { return this._entityInfo; }

    get events()
    { return this._eventInstances; }

    //#endregion

    //#region Static

    static hasEntityLogger( entityInfo : EntityInfo  ) : boolean 
    {
        return getEntityLogger(entityInfo) != null;
    }

    static createAndBindEventInstances( eventManager : AMQPEventManager, entityInfo : EntityInfo) : AMQPEntityLogger
    {
        let entityLogger = getEntityLogger(entityInfo);
        if (entityLogger) {
            entityLogger.createEventInstances(eventManager);
            return entityLogger;
        }
        else {
            eventManager.serviceSession.throwException(`It is not possible bind an AMQPEntityLogger for Entity: [${entityInfo.name}]`)
            return null;
        }
    }

    static getTriggeredEvents( entity : EMEntity, eventType : EntityEventLogType ) : Array<string>
    {
        let entityLogger = getEntityLogger(entity.entityInfo);
        if (entityLogger && entityLogger.events != null) 
            return entityLogger.events.filter( e => e.logType == eventType ).map( e => e.instance.name );
        else
            return null;   
    }


    //#endregion
}

enum EntityEventLogType {
    created = 'created',
    updated = 'updated',
    deleted = 'deleted'
}

export { AMQPEntityLogger, EntityEventLogType }