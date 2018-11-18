"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AMQPSender_1 = require("../amqp-sender/AMQPSender");
const AMQPEventArgs_1 = require("../amqp-event-args/AMQPEventArgs");
class AMQPDelegate {
    //#region Properties
    //#endregion
    //#region Methods
    constructor() {
    }
    onMessage(message) {
        let messageContent = JSON.parse(message.content.toString());
        let sender = new AMQPSender_1.AMQPSender(messageContent);
        let eventArgs = new AMQPEventArgs_1.AMQPEventArgs(messageContent);
        this.execute(sender, eventArgs);
    }
    get channelName() { return 'mainChannel'; }
}
exports.AMQPDelegate = AMQPDelegate;
//# sourceMappingURL=AMQPDelegate.js.map