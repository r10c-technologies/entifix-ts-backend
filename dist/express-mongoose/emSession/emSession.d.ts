import mongoose = require('mongoose');
import amqp = require('amqplib/callback_api');
import { HcSession } from '../../hc-core/hcSession/hcSession';
import { EntityInfo } from '../../hc-core/hcMetaData/hcMetaData';
import { ExchangeDescription, QueueBindDescription } from './amqpConnectionDynamic';
import { EMEntity, EntityDocument } from '../emEntity/emEntity';
declare class EMSession extends HcSession {
    private _mongooseInstance;
    private _mongooseConnection;
    private _brokerConnection;
    private _brokerChannel;
    private _urlMongoConnection;
    private _urlAmqpConnection;
    private _periodAmqpRetry;
    private _limitAmqpRetry;
    private _amqpExchangesDescription;
    private _amqpQueueBindsDescription;
    private _devMode;
    constructor(mongoService: string);
    constructor(mongoService: string, amqpService: string);
    connect(): Promise<void>;
    private atachToBroker;
    getModel<T extends EntityDocument>(entityName: string): mongoose.Model<T>;
    getInfo(entityName: string): EntityInfo;
    registerEntity<TDocument extends mongoose.Document, TEntity extends EMEntity>(type: {
        new (session: EMSession, document: EntityDocument): TEntity;
    }, entityInfo: EntityInfo): void;
    createDocument<T extends EntityDocument>(entityName: string, document: T): Promise<T>;
    updateDocument<T extends EntityDocument>(entityName: string, document: T): Promise<T>;
    listDocuments<T extends EntityDocument>(entityName: string): Promise<Array<T>>;
    listDocuments<T extends EntityDocument>(entityName: string, options: {
        filters?: Array<EMSessionFilter>;
        skip?: number;
        take?: number;
        sorting?: Array<EMSessionSort>;
    }): Promise<Array<T>>;
    findDocument<T extends EntityDocument>(entityName: string, id: string): Promise<T>;
    deleteDocument<T extends EntityDocument>(entityName: string, document: T): Promise<void>;
    activateEntityInstance<TEntity extends EMEntity, TModel extends EntityDocument>(name: string, document: TModel): TEntity;
    getMetadataToExpose(entityName: string): Array<{
        name: string;
        type: string;
        persistent: boolean;
    }>;
    enableDevMode(): void;
    disableDevMode(): void;
    private createError;
    private manageDocumentCreation;
    private manageDocumentUpdate;
    private manageDocumentDeletion;
    private resolveToMongoFilters;
    private parseMongoFilter;
    private resolveToMongoSorting;
    throwException(message: string): void;
    throwInfo(message: string): void;
    throwInfo(message: string, warnDevMode: boolean): void;
    periodAmqpRetry: any;
    limitAmqpRetry: any;
    readonly mongooseConnection: mongoose.Connection;
    readonly brokerConnection: amqp.Connection;
    readonly brokerChannel: amqp.Channel;
    amqpExchangesDescription: ExchangeDescription[];
    amqpQueueBindsDescription: QueueBindDescription[];
}
declare class EMSessionError {
    error: any;
    message: string;
    constructor(error: any, message: string);
}
interface EMSessionFilter {
    property: string;
    operator: string;
    value: string;
    filterType: FilterType;
}
interface EMSessionSort {
    property: string;
    sortType: SortType;
}
declare enum FilterType {
    Fixed = 1,
    Optional = 2
}
declare enum SortType {
    ascending = 1,
    descending = 2
}
export { EMSession, EMSessionError, EMSessionFilter, FilterType, SortType, EMSessionSort };
