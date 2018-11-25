import amqp = require('amqplib/callback_api');
import { AMQPEvent } from '../amqp-event/AMQPEvent';
import { TokenValidationResponse } from '../../hc-core/hcUtilities/interactionDataModels';
interface MessageStructure {
    token: string;
    requestPath: string;
    onResponse: (tokenValidationResponse: TokenValidationResponse) => void;
}
declare class TokenValidationRequestRPC extends AMQPEvent {
    protected onMessageConstruciton(data: MessageStructure): Promise<{
        data: any;
        options?: amqp.Options.Publish;
    }>;
    private generateRequestTokenId;
    readonly specificQueue: string;
}
export { TokenValidationRequestRPC };
