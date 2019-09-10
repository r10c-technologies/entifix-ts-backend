import amqp = require('amqplib/callback_api');

import { EMEntity } from '../../../../express-mongoose/emEntity/emEntity';
import { AMQPEntityLogger, EntityEventLogType } from '../../../../amqp-events/amqp-entity-logger/AMQPEntityLogger'; 
import { getRemoteAccessors } from './RemoteEntityLoggeMetadata';
import { RemoteEntityEventLogger } from './RemoteEntityEventLogger';
import { AMQPEventManager, ExchangeType, ExchangeDescription } from '../../../../amqp-events/amqp-event-manager/AMQPEventManager';
import { AMQPEventEntityLog } from '../../../../amqp-events/amqp-entity-logger/AMQPEventEntityLog';

class RemoteEntityLogger extends AMQPEntityLogger
{
    //#region Properties

    private _remoteEntityName : string;
    private _remoteServiceName : string;

    //#endregion


    //#region Methods

    constructor(remoteServiceName : string, remoteEntityName : string)
    {
        super();
        this._remoteEntityName = remoteEntityName;
        this._remoteServiceName = remoteServiceName;
    }

    protected createRoutingKey(logType : EntityEventLogType) : string {
        let rtServiceName = this._remoteServiceName.replace('-','_').toLowerCase();
        let rtRemoteEntityName = this._remoteServiceName.toLowerCase(); 
        let rtLogType = logType.toString().toLowerCase();

        return 'remote_entity_logger.' + rtServiceName + '.' + rtRemoteEntityName + '.' + rtLogType;
    }

    protected createEventInstance(eventManager : AMQPEventManager, logType : EntityEventLogType) : AMQPEventEntityLog {
        let routingKey = this.createRoutingKey(logType); 
        let eventName = this.entityInfo.name + 'Logger-' + logType;
        return new RemoteEntityEventLogger(
            eventManager,
            eventName,
            logType,
            { exchangeDescription: this.createExchangeDescription(), routingKey } 
        );        
    }


    //#endregion
    

    //#region Accessors

    //#endregion
}

export { RemoteEntityLogger }