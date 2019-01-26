import { AMQPSender } from '../amqp-sender/AMQPSender';
import { AMQPEventArgs } from '../amqp-event-args/AMQPEventArgs';
import { AMQPDelegate } from "../amqp-delegate/AMQPDelegate";
import { TokenValidationRequest, TokenValidationResponse } from '../../hc-core/hcUtilities/interactionDataModels';
declare class TokenValidationResponseRPC extends AMQPDelegate {
    private _processTokenAction;
    execute(sender: AMQPSender, eventArgs: AMQPEventArgs): Promise<void>;
    readonly queueDescription: {
        name: string;
        options: {
            durable: boolean;
        };
    };
    processTokenAction: (tokenValidationRequest: TokenValidationRequest) => Promise<TokenValidationResponse>;
}
export { TokenValidationResponseRPC };
