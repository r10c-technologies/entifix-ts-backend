/// <reference types="mongoose" />
import mongoose = require('mongoose');
import { HcSession } from '../../hcSession/hcSession';
import { EMEntity, EntityDocument } from '../emEntity/emEntity';
import { EntityInfo } from '../../hcMetaData/hcMetaData';
declare class EMSession extends HcSession {
    private _mongooseInstance;
    private _mongooseConnection;
    private _devMode;
    constructor();
    connect(url: string, success?: () => void, error?: (err) => void): void;
    getModel<T extends EntityDocument>(entityName: string): mongoose.Model<T>;
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
    private createError(error, message);
    private manageDocumentCreation<TDocument>(document);
    private manageDocumentUpdate<TDocument>(document);
    private manageDocumentDeletion<TDocument>(document);
    private resolveToMongoFilters(entityName, filters?);
    private parseMongoFilter(f, propertyType);
    private resolveToMongoSorting(entityName, sorting?);
    throwException(message: string): void;
    throwInfo(message: string): void;
    throwInfo(message: string, warnDevMode: boolean): void;
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
    Optional = 2,
}
declare enum SortType {
    ascending = 1,
    descending = 2,
}
export { EMSession, EMSessionError, EMSessionFilter, FilterType, SortType, EMSessionSort };
