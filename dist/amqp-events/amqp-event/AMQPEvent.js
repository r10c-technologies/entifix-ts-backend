"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AMQPSender_1 = require("../amqp-sender/AMQPSender");
const AMQPEventArgs_1 = require("../amqp-event-args/AMQPEventArgs");
class AMQPEvent {
    //#endregion
    //#region Methods
    constructor(eventManager) {
        this._eventManager = eventManager;
    }
    onMessageConstruciton(data) {
        return null;
    }
    constructMessage(data) {
        return new Promise((resolve, reject) => {
            let resolvePromise = (data, options) => {
                let sender = new AMQPSender_1.AMQPSender();
                sender.serviceName = this.eventManager.serviceSession.serviceName;
                sender.actionName = this.actionName;
                sender.entityName = this.entityName;
                sender.publishOptions = options;
                let eventArgs = new AMQPEventArgs_1.AMQPEventArgs();
                eventArgs.data = data;
                resolve({ sender, eventArgs });
            };
            let onConstructionTask = this.onMessageConstruciton(data);
            if (onConstructionTask)
                onConstructionTask.then(result => resolvePromise(result.data, result.options)).catch(err => reject(err));
            else
                resolvePromise(data);
        });
    }
    //#endregion
    //#region Accessors
    get exchangeName() { return null; }
    get routingKey() { return null; }
    get specificQueue() { return null; }
    get entityName() { return null; }
    get actionName() { return null; }
    get channelName() { return 'mainChannel'; }
    get eventManager() { return this._eventManager; }
}
exports.AMQPEvent = AMQPEvent;
//# sourceMappingURL=AMQPEvent.js.map