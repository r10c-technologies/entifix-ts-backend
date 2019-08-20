import 'reflect-metadata';
import { AMQPEntityLogger } from './AMQPEntityLogger';
import { EntityInfo } from '../../hc-core/hcMetaData/hcMetaData';

const AMQPEntityLoggerMetaKey = Symbol('AMQPEntityLoggerMetaKey');

function AMQPLogger();
function AMQPLogger( params : { entityLoggerType? : { new( entityName : string ) : AMQPEntityLogger } } );
function AMQPLogger( params? : { entityLoggerType? : { new( entityName : string ) : AMQPEntityLogger } } )
{
    return function(target : Function) {
        params = params || {};
        let entityLogger : AMQPEntityLogger;

        if (params.entityLoggerType)
            entityLogger = new params.entityLoggerType(target.name);
        else
            entityLogger = new AMQPEntityLogger(target.name);

        Reflect.defineMetadata( AMQPEntityLoggerMetaKey, entityLogger, target );
    }
}


function getEntityLogger( entityInfo : EntityInfo ) : AMQPEntityLogger 
{
    let metadataObject = Reflect.getMetadata(AMQPEntityLoggerMetaKey, entityInfo.entityConstructor );

    if (metadataObject instanceof AMQPEntityLogger) {
        let entityLogger = metadataObject as AMQPEntityLogger;
        return entityLogger;
    }
    else
        return null;
}

export { 
    AMQPLogger,
    getEntityLogger
}



















