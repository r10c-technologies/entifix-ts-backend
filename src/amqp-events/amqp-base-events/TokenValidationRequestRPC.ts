import amqp = require('amqplib/callback_api');

import { AMQPEvent } from '../amqp-event/AMQPEvent';
import { TokenValidationRequest, TokenValidationResponse } from '../../hc-core/hcUtilities/interactionDataModels';

interface MessageStructure {
    token: string;
    requestPath: string,
    onResponse: ( tokenValidationResponse : TokenValidationResponse ) => void
};

class TokenValidationRequestRPC extends AMQPEvent
{
    //#region Properties
    

    //#endregion

    //#region Methods

    protected onMessageConstruction(data : MessageStructure) : Promise<{ data : any, options? : amqp.Options.Publish}>
    {
        return new Promise<{ data : any, options? : amqp.Options.Publish}>( (resolve,reject) => {

            this.eventManager.createAnonymousChannel().then( ch => { 

                ch.assertQueue('', {exclusive : true }, (err, assertedQueue) => { 
                    var idRequest = this.generateRequestTokenId();
                    
                    let tokenRequest : TokenValidationRequest = {
                        token: data.token,
                        path: data.requestPath
                    };
    
                    ch.consume(
                        assertedQueue.queue,
                        message => {
                            if (message.properties.correlationId == idRequest) {
                                let validation : TokenValidationResponse = JSON.parse(message.content.toString());
                                data.onResponse(validation);
                                ch.close( err => { });
                            }
                        }, 
                        {noAck: true}
                    );

                    resolve( { data: tokenRequest, options: { correlationId : idRequest, replyTo: assertedQueue.queue }});
                });

            });

        });
    }

    private generateRequestTokenId () : string
    {
        return Math.random().toString() + Math.random().toString() + Math.random().toString();
    }

    //#endregion

    //#region Accessors

    get specificQueue()
    { return 'rpc_auth_queue'; }

    //#endregion

}

export { TokenValidationRequestRPC }


























