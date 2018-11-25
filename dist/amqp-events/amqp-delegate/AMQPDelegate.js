"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AMQPSender_1 = require("../amqp-sender/AMQPSender");
const AMQPEventArgs_1 = require("../amqp-event-args/AMQPEventArgs");
class AMQPDelegate {
    //#endregion
    //#region Methods
    constructor(eventManager) {
        this._eventManager = eventManager;
    }
    onMessage(channel) {
        return message => {
            let messageContent = JSON.parse(message.content.toString());
            let sender = new AMQPSender_1.AMQPSender(messageContent);
            let eventArgs = new AMQPEventArgs_1.AMQPEventArgs(messageContent);
            eventArgs.originalMessage = message;
            eventArgs.channel = channel;
            this.execute(sender, eventArgs);
        };
    }
    //#endregion
    //#region Accessors
    get queueName() { return null; }
    get queueOptions() { return this._queueOptions; }
    get exchangeName() { return null; }
    get channelName() { return 'mainChannel'; }
    get eventManager() { return this._eventManager; }
}
exports.AMQPDelegate = AMQPDelegate;
//# sourceMappingURL=AMQPDelegate.js.map