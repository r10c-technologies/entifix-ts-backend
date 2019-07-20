"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AMQPDelegate_1 = require("../amqp-delegate/AMQPDelegate");
class TokenValidationResponseRPC extends AMQPDelegate_1.AMQPDelegate {
    //#endregion
    //#region Methods
    execute(sender, eventArgs) {
        return new Promise((resolve, reject) => {
            let tokenRequest = eventArgs.data;
            let options = {
                correlationId: eventArgs.originalMessage.properties.correlationId,
                contentType: 'application/json',
                contentEncoding: 'UTF-8',
                headers: {
                    '__TypeId__': 'com.plustech.reportscore.model.AMQMessage'
                }
            };
            this.processTokenAction(tokenRequest).then(result => {
                eventArgs.channel.sendToQueue(eventArgs.originalMessage.properties.replyTo, new Buffer(JSON.stringify(result)), options);
                eventArgs.ackMessage();
            }).catch(error => {
                let result = { success: false, error: error };
                eventArgs.channel.sendToQueue(eventArgs.originalMessage.properties.replyTo, new Buffer(JSON.stringify(result)), options);
                eventArgs.ackMessage();
            });
        });
    }
    //#endregion
    //#region Accessors
    get queueDescription() {
        let options = {
            durable: false,
            exclusive: false,
            autoDelete: false
        };
        return {
            name: 'rpc_auth_queue',
            options
        };
    }
    get processTokenAction() { return this._processTokenAction; }
    set processTokenAction(value) { this._processTokenAction = value; }
}
exports.TokenValidationResponseRPC = TokenValidationResponseRPC;
//# sourceMappingURL=TokenValidationResponseRPC.js.map