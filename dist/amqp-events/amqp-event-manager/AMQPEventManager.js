"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AMQPEventManager {
    //#endregion
    //#region Methods
    constructor(serviceSession) {
        this._serviceSession = serviceSession;
        this._events = new Array();
        this._delegates = new Array();
    }
    registerEvent(type) {
        this._serviceSession.checkAMQPConnection();
        let instance = new type(this);
        this._events.push({ name: type.name, instance });
        return instance;
    }
    publish(eventName, data, options) {
        this._serviceSession.checkAMQPConnection();
        let pub = this._events.find(p => p.name == eventName);
        if (!pub)
            this._serviceSession.throwException(`No registered event for: ${eventName}`);
        pub.instance.constructMessage(data, options).then(amqpMessage => {
            let message = {
                sender: amqpMessage.sender.serialize(),
                eventArgs: amqpMessage.eventArgs.serialize()
            };
            this.assertEventChannel(pub.instance).then(c => {
                let content = new Buffer(JSON.stringify(message));
                if (pub.instance.specificQueue)
                    c.sendToQueue(pub.instance.specificQueue, content, amqpMessage.sender.publishOptions);
                else
                    c.publish(pub.instance.exchangeName, pub.instance.routingKey, content, amqpMessage.sender.publishOptions);
            });
        });
    }
    registerDelegate(type) {
        this._serviceSession.checkAMQPConnection();
        let instance = new type(this);
        this._delegates.push({ name: type.name, instance });
        this.assertDelegateChannel(instance).then(ch => {
            ch.assertQueue(instance.queueName, instance.queueOptions);
            ch.consume(instance.queueName, instance.onMessage(ch));
        });
        return instance;
    }
    assertDelegateChannel(delegate) {
        return this.assertChannel(delegate.channelName);
    }
    ;
    assertEventChannel(event) {
        return this.assertChannel(event.channelName);
    }
    createAnonymousChannel() {
        return this.assertChannel(null);
    }
    assertChannel(name) {
        return new Promise((resolve, reject) => {
            if (name)
                var ch = this._serviceSession.brokerChannels.find(c => c.name == name);
            if (!ch) {
                this._serviceSession.brokerConnection.createChannel((err, channel) => {
                    if (!err) {
                        this._serviceSession.brokerChannels.push({ name, instance: channel });
                        resolve(channel);
                    }
                    else
                        reject(err);
                });
            }
            else
                resolve(ch.instance);
        });
    }
    //#endregion
    //#region Accesors
    get serviceSession() { return this._serviceSession; }
}
exports.AMQPEventManager = AMQPEventManager;
//# sourceMappingURL=AMQPEventManager.js.map