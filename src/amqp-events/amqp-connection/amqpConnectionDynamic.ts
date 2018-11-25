import amqp = require('amqplib/callback_api');

interface ExchangeDescription 
{
    name: string,
    type: string,
    durable : boolean
}

interface QueueBindDescription
{
    name: string,
    exchangeName: string,
    routingKey : string,
    exclusive : boolean
}


class AMQPConnectionDynamic
{
    //#region Static

    static connect( urlConnection : string, options : { period : number, limit : number } ) : Promise<amqp.Connection>
    {
        return new Promise<amqp.Connection>( (resolve, reject) => {

            let attempts = 0;
            let connectBroker = () => {
                amqp.connect(urlConnection, (err, connection) => {
                    if (err)
                    {
                        if (attempts <= options.limit )
                            setTimeout( () => { console.log('Trying to connect broker...'); attempts++; connectBroker(); }, options.period);
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

    static createExchangeAndQueues(connection : amqp.Connection, exchangesDescription : Array<ExchangeDescription>, queueBindsDescription : Array<QueueBindDescription>) : Promise<amqp.Channel>
    {
        return new Promise<amqp.Channel>( (resolve, reject) => {
            connection.createChannel( ( err , channel ) => {
                if (!err)
                {
                    let exchangesCount = 0;

                    exchangesDescription.forEach( exchDesc => 
                    {   
                        channel.assertExchange( exchDesc.name, exchDesc.type, { durable: exchDesc.durable });                 
                        exchangesCount++;
                        
                        let queuesByExchange =  queueBindsDescription != null ? queueBindsDescription.filter( queueDesc => queueDesc.exchangeName == exchDesc.name ) : [];   
                        
                        if (queuesByExchange.length > 0)
                        {
                            let queueCount = 0;
                            queuesByExchange.forEach( queueDesc => {
                                
                                queueCount++;

                                channel.assertQueue( queueDesc.name, { exclusive: queueDesc.exclusive }, ( err, assertedQueue) => {
                                    if (!err)
                                    {
                                        channel.bindQueue(assertedQueue.queue, exchDesc.name, queueDesc.routingKey );

                                        if (exchangesCount == exchangesDescription.length && queueCount == queuesByExchange.length)
                                            resolve(channel);
                                    }
                                    else
                                        reject(err);
                                });
                            });
                        }
                        else if (exchangesCount == exchangesDescription.length)
                            resolve(channel);                        
                    });
                }
                else
                    reject(err);
            });

        });
    }

    static createChannel(connection : amqp.Connection) : Promise<amqp.Channel>
    {
        return new Promise<amqp.Channel>( (resolve,reject)=>{
            connection.createChannel( (err, channel)=>{
                if (!err)
                    resolve(channel);
                else
                    reject(err);
            });
        });
    }

    static assertE

    static assertQueue() : Promise<amqp.Replies.AssertQueue>
    {
        return new Promise<amqp.Replies.AssertQueue>( (resolve,reject)=>{

        });
    }

    //#endregion
}

export { AMQPConnectionDynamic, ExchangeDescription, QueueBindDescription }