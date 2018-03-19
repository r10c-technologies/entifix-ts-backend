/// <reference types="express" />
import { EMSession } from '../emSession/emSession';
import { EMEntity, EntityDocument } from '../emEntity/emEntity';
import { EMResponseWrapper } from '../emWrapper/emWrapper';
import express = require('express');
declare class EMEntityController<TDocument extends EntityDocument, TEntity extends EMEntity> {
    private _entityName;
    private _session;
    private _responseWrapper;
    private _useEntities;
    protected _router: express.Router;
    protected _resourceName: string;
    constructor(entityName: string, session: EMSession);
    retrieve(request: express.Request, response: express.Response): void;
    retrieveById(request: express.Request, response: express.Response): void;
    retriveMetadata(request: express.Request, response: express.Response, next: express.NextFunction): void;
    create(request: express.Request, response: express.Response): void;
    update(request: express.Request, response: express.Response): void;
    delete(request: express.Request, response: express.Response): void;
    private save(request, response);
    private constructRouter();
    protected defineRoutes(): void;
    readonly entityName: string;
    readonly session: EMSession;
    useEntities: boolean;
    readonly router: express.Router;
    protected readonly responseWrapper: EMResponseWrapper<TDocument, TEntity>;
}
export { EMEntityController };
