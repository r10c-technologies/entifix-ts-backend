"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AMQPDelegate_1 = require("../amqp-delegate/AMQPDelegate");
class TokenValidationResponseRPC extends AMQPDelegate_1.AMQPDelegate {
    //#endregion
    //#region Methods
    execute(sender, eventArgs) {
        return new Promise((resolve, reject) => {
            let tokenRequest = eventArgs.data;
            this.processTokenAction(tokenRequest).then(result => {
                eventArgs.channel.sendToQueue(eventArgs.originalMessage.properties.replyTo, new Buffer(JSON.stringify(result)), { correlationId: eventArgs.originalMessage.properties.correlationId });
                eventArgs.ackMessage();
            }).catch(error => {
                let result = { success: false, error: error };
                eventArgs.channel.sendToQueue(eventArgs.originalMessage.properties.replyTo, new Buffer(JSON.stringify(result)), { correlationId: eventArgs.originalMessage.properties.correlationId });
                eventArgs.ackMessage();
            });
        });
    }
    //#endregion
    //#region Accessors
    get queueName() { return 'rpc_auth_queue'; }
    get queueOptions() { return { durable: false }; }
    get processTokenAction() { return this._processTokenAction; }
    set processTokenAction(value) { this._processTokenAction = value; }
}
exports.TokenValidationResponseRPC = TokenValidationResponseRPC;
//# sourceMappingURL=TokenValidationResponseRPC.js.map