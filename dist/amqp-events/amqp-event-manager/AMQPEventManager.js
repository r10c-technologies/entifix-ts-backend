"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AMQPEventManager {
    //#endregion
    //#region Methods
    constructor(serviceSession) {
        this._serviceSession = serviceSession;
        this._publishers = new Array();
    }
    registerEvent(eventData) {
        this._serviceSession.checkAMQPConnection();
        if (eventData instanceof Array)
            eventData.forEach(e => this._publishers.push({ name: e.constructor.name, eventInstance: e }));
        else
            this._publishers.push({ name: eventData.constructor.name, eventInstance: eventData });
    }
    publish(eventName, data) {
        this._serviceSession.checkAMQPConnection();
        let pub = this._publishers.find(p => p.name == eventName);
        if (!pub)
            this._serviceSession.throwException(`No published register for the event: ${eventName}`);
        let amqpEventMessage = pub.eventInstance.constructMessage(this, data);
        let message = {
            sender: amqpEventMessage.sender.serialize(),
            eventArgs: amqpEventMessage.eventArgs.serialize()
        };
        this.getEventChannel(pub.eventInstance).publish(pub.eventInstance.exchangeName, pub.eventInstance.routingKey, new Buffer(JSON.stringify(message)));
    }
    registerDelegate(delegateData) {
        this._serviceSession.checkAMQPConnection();
        if (delegateData instanceof Array)
            delegateData.forEach(d => this.getDelegateChannel(d).consume(d.queueName, d.onMessage));
        else
            this.getDelegateChannel(delegateData).consume(delegateData.queueName, delegateData.onMessage);
    }
    getDelegateChannel(delegate) {
        let ch = this._serviceSession.brokerChannels.find(c => c.name == delegate.channelName);
        if (!ch)
            this._serviceSession.throwException(`Channel not found: ${delegate.channelName}`);
        return ch.channel;
    }
    ;
    getEventChannel(event) {
        let ch = this._serviceSession.brokerChannels.find(c => c.name == event.channelName);
        if (!ch)
            this._serviceSession.throwException(`Channel not found: ${event.channelName}`);
        return ch.channel;
    }
    //#endregion
    //#region Accesors
    get serviceSession() { return this._serviceSession; }
}
exports.AMQPEventManager = AMQPEventManager;
//# sourceMappingURL=AMQPEventManager.js.map