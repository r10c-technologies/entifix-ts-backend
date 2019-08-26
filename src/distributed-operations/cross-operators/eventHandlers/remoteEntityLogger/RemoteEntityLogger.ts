import amqp = require('amqplib/callback_api');

import { EMEntity } from '../../../../express-mongoose/emEntity/emEntity';
import { AMQPEventEntityLog } from '../../../../amqp-events/amqp-entity-logger/AMQPEventEntityLog'; 
import { getRemoteAccessors } from './RemoteEntityLoggeMetadata';

class RemoteEntityLogger extends AMQPEventEntityLog
{
    //#region Properties

    //#endregion


    //#region Methods


    protected onMessageConstruction( data : any ) : Promise<{ data : any, options? : amqp.Options.Publish}> 
    {
        return new Promise<{ data : any, options? : amqp.Options.Publish}>((resolve, reject) => {
            if (data instanceof EMEntity) {
                let remoteAccessors = getRemoteAccessors(data);
                let remoteData : any;
    
                if (remoteAccessors && remoteAccessors.length > 0) {
                    remoteData = { };
                    for ( let rAccessor of remoteAccessors )
                        remoteData[rAccessor.name] = data[rAccessor.name];
                }

                resolve( { data: remoteData } );
            }            
            else
                resolve( { data: null } );
        });
    }

    //#endregion
    

    //#region Accessors

    //#endregion
}

export { RemoteEntityLogger }