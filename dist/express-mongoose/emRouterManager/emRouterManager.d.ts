import express = require('express');
import { EMSession } from '../emSession/emSession';
import { EMEntityController } from '../emEntityController/emEntityController';
import { EMEntity, EntityDocument } from '../emEntity/emEntity';
declare class EMRouterManager {
    private _session;
    private _appInstance;
    private _routers;
    constructor(session: EMSession, appInstance: express.Application);
    exposeEntity<TDocument extends EntityDocument, TEntity extends EMEntity>(entityName: string): void;
    exposeEntity<TDocument extends EntityDocument, TEntity extends EMEntity>(entityName: string, options: {
        controller?: EMEntityController<TDocument, TEntity>;
        basePath?: string;
        resourceName?: string;
    }): void;
    exposeEnumeration(name: string, enumerator: any): void;
    exposeEnumeration(name: string, enumerator: any, options: {
        basePath?: string;
        resourceName?: string;
    }): void;
    resolveComplexRetrieve(request: express.Request, response: express.Response, construtorType: string, instanceId: string, expositionType: string, pathOverInstance: Array<string>): void;
    resolveComplexCreate(request: express.Request, response: express.Response, construtorType: string, instanceId: string, expositionType: string, pathOverInstance: Array<string>): void;
    resolveComplexUpdate(request: express.Request, response: express.Response, construtorType: string, instanceId: string, expositionType: string, pathOverInstance: Array<string>): void;
    resolveComplexDelete(request: express.Request, response: express.Response, construtorType: string, instanceId: string, expositionType: string, pathOverInstance: Array<string>): void;
    getExpositionDetails(): Array<{
        entityName: string;
        resourceName: string;
        basePath: string;
    }>;
    findController<TEntity extends EMEntity, TDocument extends EntityDocument>(entityName: string): EMEntityController<TDocument, TEntity>;
    readonly session: EMSession;
    readonly appInstance: express.Application;
}
declare class EMSimpleController {
    private _retrieveMethod;
    private _retrieveByIdMethod;
    private _createMethod;
    private _updateMethod;
    private _deleteMethod;
    private _router;
    private _resourceName;
    constructor(resourceName: any);
    createRoutes(): void;
    readonly router: express.Router;
    retrieveMethod: (request: express.Request, response: express.Response, next: express.NextFunction) => void;
    retrieveByIdMethod: (request: express.Request, response: express.Response, next: express.NextFunction) => void;
    createMethod: (request: express.Request, response: express.Response, next: express.NextFunction) => void;
    updateMethod: (request: express.Request, response: express.Response, next: express.NextFunction) => void;
    deleteMethod: (request: express.Request, response: express.Response, next: express.NextFunction) => void;
}
export { EMRouterManager, EMSimpleController };
