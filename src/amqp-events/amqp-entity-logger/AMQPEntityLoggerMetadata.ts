import 'reflect-metadata';
import { AMQPEntityLogger } from './AMQPEntityLogger';
import { EntityInfo } from '../../hc-core/hcMetaData/hcMetaData';

const AMQPEntityLoggerMetaKey = Symbol('AMQPEntityLoggerMetaKey');

function AMQPLogger<TEntityLogger extends AMQPEntityLogger>();
function AMQPLogger<TEntityLogger extends AMQPEntityLogger>( params : { logger? : { new( ) : TEntityLogger } | TEntityLogger } );
function AMQPLogger<TEntityLogger extends AMQPEntityLogger>( params? : { logger? : { new( ) : TEntityLogger } | TEntityLogger } )
{
    return function(target : Function) {
        params = params || {};
        let entityLogger : AMQPEntityLogger;

        if(params.logger) {
            if (params.logger instanceof AMQPEntityLogger) {
                entityLogger = params.logger as AMQPEntityLogger;
                entityLogger.entityName = target.name;
            }
            else {
                let entityLoggerConstructor = params.logger as { new( ) : TEntityLogger };
                entityLogger = new entityLoggerConstructor();
                entityLogger.entityName = target.name;
            }                
        }
        else {
            entityLogger = new AMQPEntityLogger();
            entityLogger.entityName = target.name;
        }

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



















