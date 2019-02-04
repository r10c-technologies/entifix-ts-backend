import mongoose = require('mongoose');
import express = require('express');
import { EMEntity } from '../emEntity/emEntity';
import { EMServiceSession } from '../emServiceSession/emServiceSession';
declare class EMResponseWrapper {
    private _serviceSession;
    constructor(serviceSession: EMServiceSession);
    object(response: express.Response, object: any): any;
    object(response: express.Response, object: any, options: {
        devData?: any;
        status?: number;
    }): any;
    collection(response: express.Response, collection: Array<any>): any;
    collection(response: express.Response, collection: Array<any>, options: {
        devData?: any;
        total?: number;
        skip?: number;
        take?: number;
    }): any;
    exception(response: express.Response, error: any): void;
    handledError(response: express.Response, message: string, status: number): void;
    handledError(response: express.Response, message: string, status: number, errorDetails: any): void;
    logicError(response: express.Response, message: string): void;
    logicError(response: express.Response, message: string, options: {
        errorDetails?: any;
        devData?: any;
    }): void;
    logicAccept(response: express.Response, message: string): any;
    logicAccept(response: express.Response, message: string, details: any): any;
}
declare class EMResponseEntityWrapper<TDocument extends mongoose.Document, TEntity extends EMEntity> extends EMResponseWrapper {
    document(response: express.Response, document: TDocument): void;
    document(response: express.Response, document: TDocument, options: {
        devData?: any;
        status?: number;
    }): void;
    entity(response: express.Response, entity: TEntity): void;
    entity(response: express.Response, entity: TEntity, options: {
        devData?: any;
    }): void;
    documentCollection(response: express.Response, documents: Array<TDocument>): any;
    documentCollection(response: express.Response, documents: Array<TDocument>, options: {
        devData?: any;
        total?: number;
        skip?: number;
        take?: number;
    }): any;
    entityCollection(response: express.Response, entities: Array<TEntity>): any;
    entityCollection(response: express.Response, entities: Array<TEntity>, options: {
        devData?: any;
        total?: number;
        skip?: number;
        take?: number;
    }): any;
}
export { EMResponseWrapper, EMResponseEntityWrapper };
