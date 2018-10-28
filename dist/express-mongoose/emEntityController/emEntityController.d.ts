import { EMSession } from '../emSession/emSession';
import { EMEntity, EntityDocument } from '../emEntity/emEntity';
import { EMResponseWrapper } from '../emWrapper/emWrapper';
import express = require('express');
import { EntityInfo, AccessorInfo } from '../../hc-core/hcMetaData/hcMetaData';
import { EMRouterManager } from '../emRouterManager/emRouterManager';
declare class EMEntityController<TDocument extends EntityDocument, TEntity extends EMEntity> {
    private _entityName;
    private _session;
    private _responseWrapper;
    private _useEntities;
    private _resourceName;
    protected _router: express.Router;
    constructor(entityName: string, session: EMSession);
    constructor(entityName: string, session: EMSession, resourceName: string);
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
    createRoutes(routerManager: EMRouterManager): void;
    private getArrayPath;
    createMappingPath(arrayPath: Array<string>): {
        baseTypeName: string;
        instanceId: string;
        endAccessorInfo: AccessorInfo;
        pathOverInstance: Array<string>;
    };
    resolveComplexRetrieveMethod(request: express.Request, response: express.Response, next: express.NextFunction, routerManager: EMRouterManager): void;
    resolveComplexCreateMethod(request: express.Request, response: express.Response, next: express.NextFunction, routerManager: EMRouterManager): void;
    resolveComplexUpdateMethod(request: express.Request, response: express.Response, next: express.NextFunction, routerManager: EMRouterManager): void;
    resolveComplexDeleteMethod(request: express.Request, response: express.Response, next: express.NextFunction, routerManager: EMRouterManager): void;
    findEntity(id: string): Promise<TEntity>;
    createInstance(request: express.Request, response: express.Response): Promise<TEntity>;
    private getExtensionAccessors;
    private validateQueryParams;
    validateDocumentRequest(request: express.Request, response: express.Response): Promise<RequestValidation<TDocument> | void>;
    readonly entityInfo: EntityInfo;
    readonly entityName: string;
    readonly session: EMSession;
    useEntities: boolean;
    readonly router: express.Router;
    readonly responseWrapper: EMResponseWrapper<TDocument, TEntity>;
    readonly resourceName: string;
}
interface RequestValidation<TDocument> {
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
