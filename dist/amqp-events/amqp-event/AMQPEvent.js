"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AMQPSender_1 = require("../amqp-sender/AMQPSender");
const AMQPEventArgs_1 = require("../amqp-event-args/AMQPEventArgs");
class AMQPEvent {
    constructMessage(eventManager, data) {
        let actionName = this.actionName;
        let entityName = this.entityName;
        let sender = new AMQPSender_1.AMQPSender({
            serviceName: eventManager.serviceSession.serviceName,
            actionName,
            entityName
        });
        let eventArgs = new AMQPEventArgs_1.AMQPEventArgs({
            data
        });
        return { sender, eventArgs };
    }
    get entityName() { return null; }
    get actionName() { return null; }
    get channelName() { return 'mainChannel'; }
}
exports.AMQPEvent = AMQPEvent;
//# sourceMappingURL=AMQPEvent.js.map