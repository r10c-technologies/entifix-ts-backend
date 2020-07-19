import amqp = require('amqplib/callback_api');

import { EMServiceSession } from '../../express-mongoose/emServiceSession/emServiceSession';
import { AMQPDelegate } from '../amqp-delegate/AMQPDelegate';
import { AMQPEvent } from '../amqp-event/AMQPEvent';
import { EMSession } from '../../express-mongoose/emSession/emSession';
import { EntityInfo } from '../../hc-core/hcMetaData/hcMetaData';
import { AMQPEntityLogger, EntityEventLogType } from '../amqp-entity-logger/AMQPEntityLogger';
import { EMEntity } from '../../express-mongoose/emEntity/emEntity';
import { EntifixLogger } from '../../app-utilities/logger/entifixLogger';

class AMQPEventManager
{
    //#region Properties
    
    private _serviceSession : EMServiceSession;

    private _events : Array<{ name: string, instance : AMQPEvent }>;
    private _delegates : Array<{ name: string, instance : AMQPDelegate}>;
    private _channels : Array<{ name: string, instance: amqp.Channel}>;

    private _exchangesDescription : Array<ExchangeDescription>;
    //#endregion

    //#region Methods

    constructor( serviceSession : EMServiceSession )
    {
        this._serviceSession = serviceSession;

        this._events = new Array<{name: string, instance : AMQPEvent}>();
        this._delegates = new Array<{name: string, instance: AMQPDelegate}>();
        this._exchangesDescription = new Array<ExchangeDescription>();
    }

    registerEvent<TEvent extends AMQPEvent>( event: { new( eventManager: AMQPEventManager) : TEvent } | TEvent ) : TEvent
    {
        this._serviceSession.checkAMQPConnection();
        let instance : TEvent;

        if(event instanceof AMQPEvent)
            instance = event;
        else
            instance = new event(this);
        
        if (instance.exchangeDescription)
            this.verifyExchageDescription(instance.exchangeDescription);

        this._events.push({ name: event.name, instance });

        EntifixLogger.trace({
            message: `Event regitered: ${event.name}`,
            origin: { file: 'AMQPEventManager', method: 'public: registerEvent' },
            developer: 'herber230' 
        });

        return instance;
    }


    registerDelegate<TDelegate extends AMQPDelegate>( type: { new( eventManager: AMQPEventManager) : TDelegate } | TDelegate ) : TDelegate
    {
        this._serviceSession.checkAMQPConnection();
        let instance : TDelegate;

        if(type instanceof AMQPDelegate)
            instance = type;
        else
            instance = new type(this);

        this._delegates.push( { name: type.name, instance } );

        this.assertDelegateChannel(instance).then( 
            ch => {
                ch.assertQueue(instance.queueDescription.name, instance.queueDescription.options);            
                if (instance.exchangeDescription)
                {
                    let rkPathern = instance.routingKeyPattern;
                    if (!rkPathern)
                        this._serviceSession.throwException('It is necessary to define a routing key pattern if the delegate set a Exchange Description');
                    ch.bindQueue(instance.queueDescription.name, instance.exchangeDescription.name, instance.routingKeyPattern);
                }

                EntifixLogger.trace({
                    message: `Delegate regitered and consuming messages: ${instance.name}`,
                    origin: { file: 'AMQPEventManager', method: 'public: registerEvent' },
                    developer: 'herber230' 
                });

                ch.consume(instance.queueDescription.name, instance.onMessage(ch) ); 
            }
        );

        return instance;
    }
    
    publish( eventName: string, data : any) : Promise<void>;
    publish( eventName: string, data : any, options: { session? : EMSession, entityName?: string, actionName?: string, entityId?: string } ) : Promise<void>;
    publish( eventName: string, data : any, options?: { session? : EMSession, entityName?: string, actionName?: string, entityId?: string } ) : Promise<void>
    {
        return new Promise<void>((resolve,reject) => {
            this._serviceSession.checkAMQPConnection();

            let pub = this._events.find( p => p.name == eventName);
            if (!pub)
                reject(`No registered event for: ${eventName}`);
    
            pub.instance.constructMessage( data, options ).then( amqpMessage => {
                let message = {
                    sender: amqpMessage.sender.serialize(),
                    eventArgs: amqpMessage.eventArgs.serialize()
                };
        
                let publishOptions : amqp.Options.Publish;
                if (amqpMessage.sender.publishOptions) {
                    publishOptions = amqpMessage.sender.publishOptions;
                    if (!publishOptions.contentType)
                        publishOptions.contentType = 'application/json'; 
                }
                else
                    publishOptions = { contentType: 'application/json' };
                
                this.assertEventChannel(pub.instance).then( c => {
                    let content = new Buffer(JSON.stringify(message));

                    if (!pub.instance.specificQueue) {

                        EntifixLogger.trace({
                            message: `Publishing message to exchange [${pub.instance.exchangeDescription.name}] with routing key [${pub.instance.routingKey}]`,
                            origin: { file: 'AMQPEventManager', method: 'public: publish' },
                            developer: 'herber230' 
                        });
                        
                        c.publish( pub.instance.exchangeDescription.name, pub.instance.routingKey, content, publishOptions );
                    }
                    else {

                        EntifixLogger.trace({
                            message: `Publishing message direct to queue [${pub.instance.specificQueue}]`,
                            origin: { file: 'AMQPEventManager', method: 'public: publish' },
                            developer: 'herber230' 
                        });

                        c.sendToQueue( pub.instance.specificQueue, content, publishOptions );
                    }
                    
                    resolve();
                }).catch(reject);
            }).catch(reject);
        });
    }

    assertDelegateChannel( delegate : AMQPDelegate ) : Promise<amqp.Channel>
    {
        return this.assertChannel(delegate.channelName).then( 
            channelResult => { 
                if (channelResult.isNew && delegate.exchangeDescription)
                {
                    this.verifyExchageDescription(delegate.exchangeDescription);
                    channelResult.channel.assertExchange( delegate.exchangeDescription.name, delegate.exchangeDescription.type, delegate.exchangeDescription.options );
                }  

                return channelResult.channel; 
            } 
        );
    };

    assertEventChannel( event : AMQPEvent ) : Promise<amqp.Channel>
    {
        return this.assertChannel(event.channelName).then( 
            channelResult => {
                if (channelResult.isNew && !event.specificQueue && event.exchangeDescription)
                {
                    // For events, the exchange is verified during the register
                    // this.verifyExchageDescription(event.exchangeDescription);
                    channelResult.channel.assertExchange( event.exchangeDescription.name, event.exchangeDescription.type, event.exchangeDescription.options );
                }

                return channelResult.channel
            }
        );
    }

    createAnonymousChannel() : Promise<amqp.Channel>
    {
        return this.assertChannel(null).then( channelResult => channelResult.channel );
    }

    private assertChannel( name : string ) : Promise<{ channel : amqp.Channel, isNew : boolean }>
    {
        return new Promise<{ channel : amqp.Channel, isNew : boolean }>( (resolve,reject)=>{
    
            if (name)
                var ch = this._serviceSession.brokerChannels.find( c => c.name == name );
            
            if (!ch)
            {
                this._serviceSession.brokerConnection.createChannel( (err, channel)=>{
                    if (!err)
                    {
                        this._serviceSession.brokerChannels.push( { name, instance: channel } );
                        resolve({ channel, isNew: true});
                    }
                    else
                        reject(err);
                });
            } 
            else
                resolve({ channel: ch.instance, isNew: false });
        });
    }

    private verifyExchageDescription( exchangeDescription : ExchangeDescription ) : void
    {
        let existingExchange = this._exchangesDescription.find( e => e.name == exchangeDescription.name );

        if (existingExchange)
        {
            let inconsistence = false;
            for ( let p in existingExchange )
            {
                if ( JSON.stringify(existingExchange[p]) != JSON.stringify(exchangeDescription[p]) )
                    inconsistence = true;
            }

            if (inconsistence)
                this.serviceSession.throwException(`There are inconsistences with the exchange '${exchangeDescription.name}'. Please check if all connections are using it in the same way`);
        }
        else
            this._exchangesDescription.push( exchangeDescription );
    }

    defineExchange( exchangeDescription : ExchangeDescription ) : void
    {
        this.verifyExchageDescription(exchangeDescription);
    }
    
    getExchangeDescription( exchangeName ) : ExchangeDescription
    {
        let e = this._exchangesDescription.find( e => e.name == exchangeName );

        if (!e)
            this.serviceSession.throwException(`There is no defined exchange with name '${exchangeName}'`);

        return e;
    }

    hasEntityLogger(entityInfo:EntityInfo) : boolean {
        return AMQPEntityLogger.hasEntityLogger(entityInfo);
    }

    enableLogger( entityInfo : EntityInfo ) : AMQPEntityLogger 
    {
        if (AMQPEntityLogger.hasEntityLogger(entityInfo)) {
            let entityLogger = AMQPEntityLogger.createAndBindEventInstances( this, entityInfo );
            entityLogger.events.forEach( event => this.registerEvent(event) );
        }
        else {
            this.serviceSession.throwInfo(`There is no defined AMQPEntityLogger for Entity: [${entityInfo.name}]`, true);
            return null;
        }
    }

    triggerEntityLogger( entity : EMEntity, entityEventType : EntityEventLogType )
    {
        let events = AMQPEntityLogger.getTriggeredEvents(entity, entityEventType);        
        if (events && events.length > 0)
            events.forEach( eventName => { 
                let actionName = 'entityLog.' + entityEventType.toString(); 
                this.publish( eventName, entity, { session: entity.session, entityName: entity.entityInfo.name, entityId: entity._id.toString(), actionName: actionName } ); 
            });
    }

    //#endregion

    //#region Accesors
    
    get serviceSession()
    { return this._serviceSession }

    //#endregion
}


interface QueueDescription
{
    name: string,
    options: amqp.Options.AssertQueue
}

interface QueueBindDescription
{
    name: string,
    exchangeName: string,
    routingKey : string,
    exclusive : boolean
}

interface ExchangeDescription
{
    name: string,
    type: ExchangeType,
    options: amqp.Options.AssertExchange
}

enum ExchangeType
{
    topic = 'topic',
    fanout = 'fanout',
    direct = 'direct'
}


export { AMQPEventManager, ExchangeDescription, ExchangeType, QueueDescription }