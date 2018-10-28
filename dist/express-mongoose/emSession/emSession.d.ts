import mongoose = require('mongoose');
import express = require('express');
import { HcSession } from '../../hc-core/hcSession/hcSession';
import { EntityInfo } from '../../hc-core/hcMetaData/hcMetaData';
import { EMEntity, EntityDocument } from '../emEntity/emEntity';
import { EMServiceSession } from '../emServiceSession/emServiceSession';
declare class EMSession extends HcSession {
    private _serviceSession;
    private _request;
    private _response;
    private _systemOwner;
    constructor(serviceSession: EMServiceSession, request: express.Request, response: express.Response);
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
    readonly request: express.Request;
    readonly response: any;
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
interface ListOptions {
    filters?: Array<EMSessionFilter>;
    skip?: number;
    take?: number;
    sorting?: Array<EMSessionSort>;
    mongoFilters?: any;
}
interface ListDocsResultDetails<TDoc extends EntityDocument> {
    docs: Array<TDoc>;
    details?: {
        total?: number;
        skip?: number;
        take?: number;
    };
}
interface ListEntitiesResultDetails<TEntity extends EMEntity> {
    entities: Array<TEntity>;
    details?: {
        total?: number;
        skip?: number;
        take?: number;
    };
}
export { EMSession, EMSessionFilter, FilterType, SortType, EMSessionSort, ListOptions };
