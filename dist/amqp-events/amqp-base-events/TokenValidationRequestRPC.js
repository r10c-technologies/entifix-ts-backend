"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AMQPEvent_1 = require("../amqp-event/AMQPEvent");
;
class TokenValidationRequestRPC extends AMQPEvent_1.AMQPEvent {
    //#region Properties
    //#endregion
    //#region Methods
    onMessageConstruction(data) {
        return new Promise((resolve, reject) => {
            this.eventManager.createAnonymousChannel().then(ch => {
                ch.assertQueue('', { exclusive: true }, (err, assertedQueue) => {
                    var idRequest = this.generateRequestTokenId();
                    let tokenRequest = {
                        token: data.token,
                        path: data.requestPath
                    };
                    ch.consume(assertedQueue.queue, message => {
                        if (message.properties.correlationId == idRequest) {
                            let validation = JSON.parse(message.content.toString());
                            data.onResponse(validation);
                            ch.close(err => { });
                        }
                    }, { noAck: true });
                    resolve({ data: tokenRequest, options: { correlationId: idRequest, replyTo: assertedQueue.queue } });
                });
            });
        });
    }
    generateRequestTokenId() {
        return Math.random().toString() + Math.random().toString() + Math.random().toString();
    }
    //#endregion
    //#region Accessors
    get specificQueue() { return 'rpc_auth_queue'; }
}
exports.TokenValidationRequestRPC = TokenValidationRequestRPC;
//# sourceMappingURL=TokenValidationRequestRPC.js.map