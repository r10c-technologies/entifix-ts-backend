import mongoose = require('mongoose');
import express = require('express');
import 'moment';
import { HcSession } from '../../hc-core/hcSession/hcSession';
import { EntityInfo, MethodInfo } from '../../hc-core/hcMetaData/hcMetaData';
import { EMEntity, EntityDocument } from '../emEntity/emEntity';
import { EMServiceSession } from '../emServiceSession/emServiceSession';
import { PrivateUserData } from '../../hc-core/hcUtilities/interactionDataModels';
import { EMEntityMultiKey, IEntityKey } from '../emEntityMultiKey/emEntityMultiKey';
declare class EMSession extends HcSession {
    private _request;
    private _response;
    protected _privateUserData: PrivateUserData;
    protected _serviceSession: EMServiceSession;
    private _anchoredFiltering;
    constructor(serviceSession: EMServiceSession, options: {
        request: express.Request;
        response: express.Response;
    });
    constructor(serviceSession: EMServiceSession, options: {
        privateUserData: PrivateUserData;
    });
    getModel<T extends EntityDocument>(entityName: string): mongoose.Model<T>;
    getInfo(entityName: string): EntityInfo;
    createDocument<T extends EntityDocument>(entityName: string, document: T): Promise<T>;
    updateDocument<T extends EntityDocument>(entityName: string, document: T): Promise<T>;
    listDocuments<T extends EntityDocument>(entityName: string): Promise<ListDocsResultDetails<T>>;
    listDocuments<T extends EntityDocument>(entityName: string, options: ListOptions): Promise<ListDocsResultDetails<T>>;
    findDocument<T extends EntityDocument>(entityName: string, id: string): Promise<T>;
    deleteDocument<T extends EntityDocument>(entityName: string, document: T): Promise<void>;
    activateEntityInstance<TEntity extends EMEntity, TModel extends EntityDocument>(info: EntityInfo, document: TModel): Promise<TEntity>;
    activateEntityInstance<TEntity extends EMEntity, TModel extends EntityDocument>(info: EntityInfo, document: TModel, options: {
        changes: Array<{
            property: string;
            oldValue: any;
            newValue: any;
        }>;
    }): Promise<TEntity>;
    getMetadataToExpose(entityName: string): Array<{
        name: string;
        type: string;
        persistent: boolean;
    }>;
    findEntity<TEntity extends EMEntity, TModel extends EntityDocument>(info: EntityInfo, id: string): Promise<TEntity>;
    listEntities<TEntity extends EMEntity, TDocument extends EntityDocument>(entityName: string): Promise<ListEntitiesResultDetails<TEntity>>;
    listEntities<TEntity extends EMEntity, TDocument extends EntityDocument>(entityName: string, options: ListOptions): Promise<ListEntitiesResultDetails<TEntity>>;
    listDocumentsByQuery<TDocument extends EntityDocument>(entityName: string, mongoFilters: any): Promise<Array<TDocument>>;
    listEntitiesByQuery<TEntity extends EMEntity, TDocument extends EntityDocument>(info: EntityInfo, mongoFilters: any): Promise<Array<TEntity>>;
    findByKey<TEntity extends EMEntityMultiKey, TDocument extends EntityDocument>(info: EntityInfo, key: IEntityKey): Promise<TEntity>;
    setFiltering(filtering: EMSessionFilter | Array<EMSessionFilter>): void;
    clearFiltering(): void;
    private createError;
    private manageDocumentCreation;
    private manageDocumentUpdate;
    private manageDocumentDeletion;
    private resolveToMongoFilters;
    private parseMongoFilter;
    private resolveToMongoSorting;
    private checkPossibleDate;
    publishAMQPMessage(eventName: string, data: any): void;
    publishAMQPAction(methodInfo: MethodInfo, entityId: string, data: any): void;
    throwException(message: string): void;
    throwInfo(message: string): void;
    throwInfo(message: string, warnDevMode: boolean): void;
    readonly request: express.Request;
    readonly response: express.Response;
    readonly userName: string;
    readonly systemOwner: string;
    readonly userCompleteName: string;
    readonly serviceSession: EMServiceSession;
    readonly privateUserData: PrivateUserData;
}
interface EMSessionFilter {
    property: string;
    operator: string;
    value: string;
    complexFilter: boolean;
    parentProperty: string;
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
interface ListOptions {
    filters?: Array<EMSessionFilter>;
    skip?: number;
    take?: number;
    sorting?: Array<EMSessionSort>;
}
interface ListDocsResultDetails<TDoc extends EntityDocument> {
    docs: Array<TDoc>;
    details?: {
        total?: number;
        skip?: number;
        take?: number;
        devData?: any;
    };
}
interface ListEntitiesResultDetails<TEntity extends EMEntity> {
    entities: Array<TEntity>;
    details?: {
        total?: number;
        skip?: number;
        take?: number;
        devData?: any;
    };
}
interface FiltersConversion {
    filters?: any;
    inconsistencies?: Array<{
        property: string;
        message: string;
    }>;
}
export { EMSession, EMSessionFilter, FilterType, SortType, EMSessionSort, ListOptions, FiltersConversion };
