"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const amqp = require("amqplib/callback_api");
class AMQPConnectionDynamic {
    //#region Static
    static connect(urlConnection, options) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            let connectBroker = () => {
                amqp.connect(urlConnection, (err, connection) => {
                    if (err) {
                        if (attempts <= options.limit)
                            setTimeout(() => { console.log('Trying to connect broker...'); attempts++; connectBroker(); }, options.period);
                        else
                            reject();
                    }
                    else
                        resolve(connection);
                });
            };
            connectBroker();
        });
    }
    static createExchangeAndQueues(connection, exchangesDescription, queueBindsDescription) {
        return new Promise((resolve, reject) => {
            connection.createChannel((err, channel) => {
                if (!err) {
                    let exchangesCount = 0;
                    exchangesDescription.forEach(exchDesc => {
                        exchangesCount++;
                        let queueCount = 0;
                        let queuesByExchange = queueBindsDescription.filter(queueDesc => queueDesc.exchangeName == exchDesc.name);
                        channel.assertExchange(exchDesc.name, exchDesc.type, { durable: exchDesc.durable });
                        queuesByExchange.forEach(queueDesc => {
                            queueCount++;
                            channel.assertQueue(queueDesc.name, { exclusive: queueDesc.exclusive }, (err, assertedQueue) => {
                                if (!err) {
                                    channel.bindQueue(assertedQueue.queue, exchDesc.name, queueDesc.routingKey);
                                    if (exchangesCount == exchangesDescription.length && queueCount == queuesByExchange.length)
                                        resolve(channel);
                                }
                                else
                                    reject(err);
                            });
                        });
                    });
                }
                else
                    reject(err);
            });
        });
    }
}
exports.AMQPConnectionDynamic = AMQPConnectionDynamic;
//# sourceMappingURL=amqpConnectionDynamic.js.map