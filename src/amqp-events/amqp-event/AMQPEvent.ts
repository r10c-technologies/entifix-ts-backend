import amqp = require('amqplib/callback_api');

import { AMQPEventMessage } from '../amqp-models/amqp-models';
import { AMQPEventManager } from '../amqp-event-manager/AMQPEventManager';
import { AMQPSender } from '../amqp-sender/AMQPSender';
import { AMQPEventArgs } from '../amqp-event-args/AMQPEventArgs';
import { EMSession } from '../../express-mongoose/emSession/emSession';


interface EventMovementFlow
{
    continue: boolean; 
    data? : any;
}

abstract class AMQPEvent 
{
    //#region Properties

    private _eventManager : AMQPEventManager;

    //#endregion

    //#region Methods

    constructor(eventManager : AMQPEventManager) 
    {
        this._eventManager = eventManager;
    }

    protected onMessageConstruciton(data : any) : Promise<{ data : any, options? : amqp.Options.Publish}>
    {
        return null;
    }
    
    constructMessage( data : any ) : Promise<AMQPEventMessage>
    constructMessage( data : any, options: { session? : EMSession, entityName? : string, actionName? : string, entityId? : string } ) : Promise<AMQPEventMessage>
    constructMessage( data : any, options?: { session? : EMSession, entityName? : string, actionName? : string, entityId? : string } ) : Promise<AMQPEventMessage>
    {
        let generalOptions = options || { };
        return new Promise<AMQPEventMessage>( 
            (resolve,reject) => {
                let resolvePromise = (data, options?) => {
                    let sender = new AMQPSender({
                        sender: {
                            serviceName : this.eventManager.serviceSession.serviceName,
                            actionName : generalOptions.actionName,
                            entityName : generalOptions.entityName,
                            entityId : generalOptions.entityId,
                            privateUserData : generalOptions && generalOptions.session ? generalOptions.session.privateUserData : null
                        }
                    }, { publishOptions: options });
                    
                    let eventArgs = new AMQPEventArgs({
                        eventArgs: { data }
                    });

                    resolve({ sender, eventArgs});
                };

                let onConstructionTask = this.onMessageConstruciton(data);
                if (onConstructionTask)
                    onConstructionTask.then( result => resolvePromise(result.data, result.options)).catch( err => reject(err));
                else
                    resolvePromise(data);
            }
        );
    }

    //#endregion

    //#region Accessors

    get exchangeName () : string
    { return null; }
    
    get routingKey() : string
    { return null; }

    get specificQueue() : string
    { return null; }

    get channelName () : string
    { return 'mainChannel' }

    get eventManager () 
    { return this._eventManager; }

    //#endregion

}

export { AMQPEvent, EventMovementFlow }


