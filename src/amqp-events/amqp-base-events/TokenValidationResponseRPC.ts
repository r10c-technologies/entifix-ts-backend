import amqp = require('amqplib/callback_api');

import { AMQPSender } from '../amqp-sender/AMQPSender';
import { AMQPEventArgs } from '../amqp-event-args/AMQPEventArgs';
import { AMQPDelegate } from "../amqp-delegate/AMQPDelegate";
import { TokenValidationRequest, TokenValidationResponse } from '../../hc-core/hcUtilities/interactionDataModels';
import { reject } from 'bluebird';


class TokenValidationResponseRPC extends AMQPDelegate
{
    //#region Properties

    private _processTokenAction : (tokenValidationRequest : TokenValidationRequest) => Promise<TokenValidationResponse>;

    //#endregion

    //#region Methods

    execute( sender : AMQPSender, eventArgs : AMQPEventArgs) : Promise<void>
    {
        return new Promise<void>((resolve,reject) => {
            let tokenRequest : TokenValidationRequest = eventArgs.data;
            
            this.processTokenAction(tokenRequest).then(
                result => {                    
                    eventArgs.channel.sendToQueue(eventArgs.originalMessage.properties.replyTo, new Buffer(JSON.stringify(result)), { correlationId: eventArgs.originalMessage.properties.correlationId } );
                    eventArgs.ackMessage();
                }
            ).catch( 
                error => {
                    let result : TokenValidationResponse = { success: false, error: error };

                    eventArgs.channel.sendToQueue(eventArgs.originalMessage.properties.replyTo, new Buffer(JSON.stringify(result)), { correlationId: eventArgs.originalMessage.properties.correlationId } );
                    eventArgs.ackMessage();
                }
            );
        });        
    }

    //#endregion

    //#region Accessors

    get queueDescription()
    {
        return {
            name: 'rpc_auth_queue',
            options: { durable: false } 
        };
    }

    get processTokenAction()
    { return this._processTokenAction; }    
    set processTokenAction( value )
    { this._processTokenAction = value; } 

    //#endregion

}

export { TokenValidationResponseRPC }