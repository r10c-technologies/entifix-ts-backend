import amqp = require('amqplib/callback_api');

import { EMEntity } from '../../../../express-mongoose/emEntity/emEntity';
import { AMQPEventEntityLog } from '../../../../amqp-events/amqp-entity-logger/AMQPEventEntityLog'; 
import { getRemoteAccessors } from './RemoteEntityLoggeMetadata';

class RemoteEntityEventLogger extends AMQPEventEntityLog
{
    //#region Properties

    //#endregion


    //#region Methods

    private constructRemoteData(data : any) : any 
    {
        let remoteData : any;
        let remoteAccessors = getRemoteAccessors(data);
        
        if (remoteAccessors && remoteAccessors.length > 0) {
            for ( let remoteAccessorDef of remoteAccessors ) 
            {
                let accessorData = data[remoteAccessorDef.name]; 
                let targetName = remoteAccessorDef.target || remoteAccessorDef.name;
                if (accessorData) 
                {
                    if (!remoteData)
                        remoteData = { };

                    if (remoteAccessorDef.extract) 
                    {
                        let performExtraction = (sectionData) => {
                            let extracted : any;
                            if (remoteAccessorDef.extract instanceof Array) {
                                extracted = {};
                                remoteAccessorDef.extract.forEach( rad => extracted[rad.to] = sectionData[rad.from] );
                            }

                            if (remoteAccessorDef.extract['from'] && remoteAccessorDef.extract['to']) 
                                extracted = {
                                    [remoteAccessorDef.extract['to']]: sectionData[remoteAccessorDef.extract['from']]
                                };
                            
                            if (typeof remoteAccessorDef.extract == 'string') 
                                extracted = sectionData[remoteAccessorDef.extract];
                            
                            return extracted;
                        };

                        if (accessorData instanceof Array) {
                            remoteData[targetName] = [];
                            accessorData.forEach( ad => remoteData[targetName].push(performExtraction(ad)) );
                        } 
                        else 
                            remoteData[targetName] = performExtraction(accessorData); 
                    } 
                    else 
                        remoteData[targetName] = accessorData;
                }
            }
        }

        return remoteData;
    }

    protected onMessageConstruction( data : any ) : Promise<{ data : any, options? : amqp.Options.Publish}> 
    {
        return new Promise<{ data : any, options? : amqp.Options.Publish}>((resolve, reject) => {
            if (data instanceof EMEntity) {
                let remoteData = this.constructRemoteData(data);
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

export { RemoteEntityEventLogger }