import mongoose = require('mongoose');
import express = require('express');
import { EMEntity } from '../emEntity/emEntity';
declare class EMResponseWrapper<TDocument extends mongoose.Document, TEntity extends EMEntity> {
    object(response: express.Response, object: any): any;
    object(response: express.Response, object: any, status: number): any;
    document(response: express.Response, document: TDocument): any;
    document(response: express.Response, document: TDocument, status: number): any;
    entity(response: express.Response, entity: TEntity): any;
    entity(response: express.Response, entity: TEntity, status: number): any;
    documentCollection(response: express.Response, documents: Array<TDocument>): any;
    documentCollection(response: express.Response, documents: Array<TDocument>, status: number): any;
    entityCollection(response: express.Response, entities: Array<TEntity>): any;
    entityCollection(response: express.Response, entities: Array<TEntity>, status: number): any;
    error(response: express.Response, message: string, code: number): void;
    sessionError(response: express.Response, error: any): void;
    logicError(response: express.Response, message: string): any;
    logicError(response: express.Response, message: string, errorDetails: any): any;
    logicAccept(response: express.Response, message: string): any;
    logicAccept(response: express.Response, message: string, details: any): any;
}
export { EMResponseWrapper };
