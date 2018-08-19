import amqp = require('amqplib/callback_api');
interface ExchangeDescription {
    name: string;
    type: string;
    durable: boolean;
}
interface QueueBindDescription {
    name: string;
    exchangeName: string;
    routingKey: string;
    exclusive: boolean;
}
declare class AMQPConnectionDynamic {
    static connect(urlConnection: string, options: {
        period: number;
        limit: number;
    }): Promise<amqp.Connection>;
    static createExchangeAndQueues(connection: amqp.Connection, exchangesDescription: Array<ExchangeDescription>, queueBindsDescription: Array<QueueBindDescription>): Promise<amqp.Channel>;
}
export { AMQPConnectionDynamic, ExchangeDescription, QueueBindDescription };
