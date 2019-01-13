"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ExchangeType;
(function (ExchangeType) {
    ExchangeType["topic"] = "topic";
    ExchangeType["fanout"] = "fanout";
    ExchangeType["direct"] = "direct";
})(ExchangeType || (ExchangeType = {}));
exports.ExchangeType = ExchangeType;
class AMQPEventManager {
    //#endregion
    //#region Methods
    constructor(serviceSession) {
        this._serviceSession = serviceSession;
        this._events = new Array();
        this._delegates = new Array();
        this._exchangesDescription = new Array();
    }
    registerEvent(type) {
        this._serviceSession.checkAMQPConnection();
        let instance = new type(this);
        if (instance.exchangeDescription)
            this.verifyExchageDescription(instance.exchangeDescription);
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
                if (!pub.instance.specificQueue)
                    c.publish(pub.instance.exchangeDescription.name, pub.instance.routingKey, content, amqpMessage.sender.publishOptions);
                else
                    c.sendToQueue(pub.instance.specificQueue, content, amqpMessage.sender.publishOptions);
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
        return this.assertChannel(delegate.channelName).then(channelResult => channelResult.channel);
    }
    ;
    assertEventChannel(event) {
        return this.assertChannel(event.channelName).then(channelResult => {
            if (channelResult.isNew && !event.specificQueue && event.exchangeDescription)
                channelResult.channel.assertExchange(event.exchangeDescription.name, event.exchangeDescription.type, { durable: event.exchangeDescription.durable });
            return channelResult.channel;
        });
    }
    createAnonymousChannel() {
        return this.assertChannel(null).then(channelResult => channelResult.channel);
    }
    assertChannel(name) {
        return new Promise((resolve, reject) => {
            if (name)
                var ch = this._serviceSession.brokerChannels.find(c => c.name == name);
            if (!ch) {
                this._serviceSession.brokerConnection.createChannel((err, channel) => {
                    if (!err) {
                        this._serviceSession.brokerChannels.push({ name, instance: channel });
                        resolve({ channel, isNew: true });
                    }
                    else
                        reject(err);
                });
            }
            else
                resolve({ channel: ch.instance, isNew: false });
        });
    }
    verifyExchageDescription(exchangeDescription) {
        let existingExchange = this._exchangesDescription.find(e => e.name == exchangeDescription.name);
        if (existingExchange) {
            let inconsistence = false;
            for (let p in existingExchange) {
                if (existingExchange[p] != exchangeDescription[p])
                    inconsistence = true;
            }
            if (inconsistence)
                this.serviceSession.throwException(`There are inconsistences with the exchange '${exchangeDescription.name}'. Please check if all connections are using it in the same way`);
        }
        else
            this._exchangesDescription.push(exchangeDescription);
    }
    defineExchange(exchangeDescription) {
        this.verifyExchageDescription(exchangeDescription);
    }
    getExchangeDescription(exchangeName) {
        let e = this._exchangesDescription.find(e => e.name == exchangeName);
        if (!e)
            this.serviceSession.throwException(`There is no defined exchange with name '${exchangeName}'`);
        return e;
    }
    //#endregion
    //#region Accesors
    get serviceSession() { return this._serviceSession; }
}
exports.AMQPEventManager = AMQPEventManager;
//# sourceMappingURL=AMQPEventManager.js.map