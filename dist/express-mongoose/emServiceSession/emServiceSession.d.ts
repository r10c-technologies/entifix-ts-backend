import mongoose = require('mongoose');
import amqp = require('amqplib/callback_api');
import { ExchangeDescription, QueueBindDescription } from '../../amqp-events/amqp-connection/amqpConnectionDynamic';
import { EMEntity, EntityDocument } from '../emEntity/emEntity';
import { EntityInfo } from '../../hc-core/hcMetaData/hcMetaData';
import { EMSession } from '../emSession/emSession';
import { PrivateUserData } from '../../hc-core/hcUtilities/interactionDataModels';
import { AMQPEventManager } from '../../amqp-events/amqp-event-manager/AMQPEventManager';
declare class EMServiceSession {
    private _serviceName;
    private _mongooseInstance;
    private _mongooseConnection;
    private _brokerConnection;
    private _brokerChannels;
    private _urlMongoConnection;
    private _urlAmqpConnection;
    private _periodAmqpRetry;
    private _limitAmqpRetry;
    private _amqpExchangesDescription;
    private _amqpQueueBindsDescription;
    private _amqpEventManager;
    private _devMode;
    private _entitiesInfo;
    constructor(serviceName: string, mongoService: string);
    constructor(serviceName: string, mongoService: string, amqpService: string);
    connect(): Promise<void>;
    private atachToBroker;
    createAndBindEventManager(): AMQPEventManager;
    publishAMQPMessage(session: EMSession, eventName: string, data: any): void;
    getInfo(entityName: string): EntityInfo;
    getModel<TDocument extends EntityDocument>(entityName: string, systemOwner: string): mongoose.Model<TDocument>;
    registerEntity<TDocument extends mongoose.Document, TEntity extends EMEntity>(type: {
        new (session: EMSession, document: EntityDocument): TEntity;
    }, entityInfo: EntityInfo): void;
    createDeveloperModels(): void;
    verifySystemOwnerModels(systemOwner: string): void;
    enableDevMode(): void;
    disableDevMode(): void;
    throwException(message: string): void;
    throwInfo(message: string): void;
    throwInfo(message: string, warnDevMode: boolean): void;
    createError(error: any, message: string): EMSessionError;
    checkAMQPConnection(): void;
    readonly serviceName: string;
    readonly entitiesInfo: {
        name: string;
        info: EntityInfo;
        schema: any;
        models: {
            systemOwner: string;
            model: any;
        }[];
        activateType: (s: EMSession, d: EntityDocument) => any;
        modelActivator: any;
    }[];
    readonly isDevMode: boolean;
    periodAmqpRetry: any;
    limitAmqpRetry: any;
    readonly mongooseConnection: mongoose.Connection;
    readonly brokerConnection: amqp.Connection;
    readonly brokerChannels: {
        name: string;
        instance: amqp.Channel;
    }[];
    amqpExchangesDescription: ExchangeDescription[];
    amqpQueueBindsDescription: QueueBindDescription[];
    readonly mainChannel: amqp.Channel;
    readonly developerUserData: PrivateUserData;
}
declare class EMSessionError {
    private _code;
    private _error;
    private _message;
    private _isHandled;
    constructor(error: any, message: string);
    setAsHandledError(code: number, message: string): void;
    readonly error: any;
    readonly message: string;
    readonly code: number;
    readonly isHandled: boolean;
}
export { EMServiceSession, EMSessionError };
