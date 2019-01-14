import express = require('express');
import { EMSession } from '../emSession/emSession';
import { EMEntityController } from '../emEntityController/emEntityController';
import { EMEntity, EntityDocument } from '../emEntity/emEntity';
import { EMResponseWrapper } from '../emWrapper/emWrapper';
import { AccessorInfo } from '../../hc-core/hcMetaData/hcMetaData';
import { EMServiceSession } from '../emServiceSession/emServiceSession';
declare class EMRouterManager {
    private _serviceSession;
    private _expressAppInstance;
    private _routers;
    constructor(serviceSession: EMServiceSession, exrpressAppInstance: express.Application);
    exposeEntity<TDocument extends EntityDocument, TEntity extends EMEntity>(entityName: string): void;
    exposeEntity<TDocument extends EntityDocument, TEntity extends EMEntity>(entityName: string, options: {
        controller?: EMEntityController<TDocument, TEntity>;
        basePath?: string;
        resourceName?: string;
    }): void;
    atachController(controller: EMSimpleController): any;
    atachController(controller: EMSimpleController, options: {
        basePath?: string;
    }): any;
    exposeEnumeration(name: string, enumerator: any): void;
    exposeEnumeration(name: string, enumerator: any, options: {
        basePath?: string;
        resourceName?: string;
    }): void;
    resolveComplexRetrieve(session: EMSession, construtorType: string, instanceId: string, expositionAccessorInfo: AccessorInfo, pathOverInstance: Array<string>): void;
    resolveComplexCreate(session: EMSession, construtorType: string, instanceId: string, expositionAccessorInfo: AccessorInfo, pathOverInstance: Array<string>): void;
    resolveComplexUpdate(session: EMSession, construtorType: string, instanceId: string, expositionAccessorInfo: AccessorInfo, pathOverInstance: Array<string>): void;
    resolveComplexDelete(session: EMSession, construtorType: string, instanceId: string, expositionAccessorInfo: AccessorInfo, pathOverInstance: Array<string>): void;
    getExpositionDetails(): Array<{
        entityName: string;
        resourceName: string;
        basePath: string;
    }>;
    findController<TEntity extends EMEntity, TDocument extends EntityDocument>(entityName: string): EMEntityController<TDocument, TEntity>;
    readonly serviceSession: EMServiceSession;
    readonly expressAppInstance: express.Application;
}
declare class EMSimpleController {
    private _retrieveMethod;
    private _retrieveByIdMethod;
    private _createMethod;
    private _updateMethod;
    private _deleteMethod;
    private _router;
    private _resourceName;
    private _routerManager;
    private _responseWrapper;
    constructor(routerManager: EMRouterManager, resourceName: string);
    createRoutes(): void;
    protected createSession(request: express.Request, response: express.Response): Promise<EMSession | void>;
    readonly router: express.Router;
    retrieveMethod: (request: express.Request, response: express.Response, next: express.NextFunction) => void;
    retrieveByIdMethod: (request: express.Request, response: express.Response, next: express.NextFunction) => void;
    createMethod: (request: express.Request, response: express.Response, next: express.NextFunction) => void;
    updateMethod: (request: express.Request, response: express.Response, next: express.NextFunction) => void;
    deleteMethod: (request: express.Request, response: express.Response, next: express.NextFunction) => void;
    protected readonly responseWrapper: EMResponseWrapper;
}
export { EMRouterManager, EMSimpleController };
