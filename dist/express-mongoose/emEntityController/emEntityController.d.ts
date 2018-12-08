import { EMSession } from '../emSession/emSession';
import { EMEntity, EntityDocument } from '../emEntity/emEntity';
import { EMResponseWrapper } from '../emWrapper/emWrapper';
import express = require('express');
import { EntityInfo, AccessorInfo } from '../../hc-core/hcMetaData/hcMetaData';
import { EMRouterManager } from '../emRouterManager/emRouterManager';
declare class EMEntityController<TDocument extends EntityDocument, TEntity extends EMEntity> {
    private _entityName;
    private _responseWrapper;
    private _useEntities;
    private _resourceName;
    private _routerManager;
    protected _router: express.Router;
    constructor(entityName: string, routerManager: EMRouterManager);
    constructor(entityName: string, routerManager: EMRouterManager, options: {
        resourceName?: string;
    });
    private createRoutes;
    retrieve(request: express.Request, response: express.Response): void;
    retrieveById(request: express.Request, response: express.Response): void;
    retrieveById(request: express.Request, response: express.Response, options: {
        paramName?: string;
    }): void;
    retriveMetadata(request: express.Request, response: express.Response, next: express.NextFunction): void;
    create(request: express.Request, response: express.Response): void;
    update(request: express.Request, response: express.Response): void;
    delete(request: express.Request, response: express.Response): void;
    delete(request: express.Request, response: express.Response, options: {
        paramName?: string;
    }): void;
    private save;
    action(request: express.Request, response: express.Response): void;
    private createSession;
    private validateQueryParams;
    validateDocumentRequest(request: express.Request, response: express.Response): Promise<RequestValidation<TDocument> | void>;
    validateDocumentRequest(request: express.Request, response: express.Response, options: {
        alwaysNew?: boolean;
    }): Promise<RequestValidation<TDocument> | void>;
    private getArrayPath;
    createMappingPath(arrayPath: Array<string>): {
        baseTypeName: string;
        instanceId: string;
        endAccessorInfo: AccessorInfo;
        pathOverInstance: Array<string>;
    };
    resolveComplexRetrieveMethod(request: express.Request, response: express.Response, next: express.NextFunction): void;
    resolveComplexCreateMethod(request: express.Request, response: express.Response, next: express.NextFunction): void;
    resolveComplexUpdateMethod(request: express.Request, response: express.Response, next: express.NextFunction): void;
    resolveComplexDeleteMethod(request: express.Request, response: express.Response, next: express.NextFunction): void;
    findEntity(session: EMSession, id: string): Promise<TEntity>;
    createInstance(request: express.Request, response: express.Response): Promise<TEntity>;
    createInstance(request: express.Request, response: express.Response, options: {
        alwaysNew?: boolean;
    }): Promise<TEntity>;
    private getExtensionAccessors;
    readonly entityInfo: EntityInfo;
    readonly entityName: string;
    useEntities: boolean;
    readonly router: express.Router;
    readonly responseWrapper: EMResponseWrapper<TDocument, TEntity>;
    readonly resourceName: string;
}
interface RequestValidation<TDocument> {
    session?: EMSession;
    document?: TDocument;
    error?: string;
    errorData?: any;
    devData?: any;
    changes?: Array<{
        property: string;
        oldValue: any;
        newValue: any;
    }>;
}
export { EMEntityController, RequestValidation };
