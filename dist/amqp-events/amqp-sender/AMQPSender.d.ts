import amqp = require('amqplib/callback_api');
import { PrivateUserData } from '../../hc-core/hcUtilities/interactionDataModels';
declare class AMQPSender {
    private _serviceName;
    private _entityName;
    private _actionName;
    private _privateUserData;
    private _publishOptions;
    constructor(messageContent: any);
    constructor(messageContent: any, options: {
        publishOptions?: amqp.Options.Publish;
    });
    serialize(): any;
    readonly serviceName: string;
    readonly entityName: string;
    readonly actionName: string;
    readonly publishOptions: amqp.Options.Publish;
    readonly privateUserData: PrivateUserData;
}
export { AMQPSender };
