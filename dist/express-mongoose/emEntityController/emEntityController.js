"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emSession_1 = require("../emSession/emSession");
const emEntity_1 = require("../emEntity/emEntity");
const emWrapper_1 = require("../emWrapper/emWrapper");
const HttpStatus = require("http-status-codes");
const express = require("express");
const hcMetaData_1 = require("../../hc-core/hcMetaData/hcMetaData");
class EMEntityController {
    constructor(entityName, session, resourceName) {
        this._entityName = entityName;
        this._session = session;
        this._useEntities = true;
        this._responseWrapper = new emWrapper_1.EMResponseWrapper(session);
        this._resourceName = resourceName || entityName.toLowerCase();
        this._router = express.Router();
    }
    retrieve(request, response) {
        //Manage query params options
        let queryParamsConversion = this.validateQueryParams(request, response);
        if (queryParamsConversion.error)
            return;
        let queryParams = queryParamsConversion.queryParams;
        let filterParam = queryParams.filter(qp => qp.paramName == 'filter');
        let filters = filterParam.length > 0 ? filterParam.map(qp => qp) : null;
        let sortParam = queryParams.filter(qp => qp.paramName == 'sort');
        let sorting = sortParam.length > 0 ? sortParam.map(qp => qp) : null;
        let skipParam = queryParams.find(qp => qp.paramName == 'skip');
        let skip = skipParam != null ? parseInt(skipParam.paramValue) : null;
        let takeParam = queryParams.find(qp => qp.paramName == 'take');
        let take = takeParam != null ? parseInt(takeParam.paramValue) : 100; // Retrive limit protector
        //Call the execution of mongo query inside EMSession
        if (this._useEntities)
            this._session.listEntities(this._entityName, { filters, skip, take, sorting }).then(entityResults => this._responseWrapper.entityCollection(response, entityResults), error => this._responseWrapper.exception(response, error));
        else
            this._session.listDocuments(this._entityName, { filters, skip, take, sorting }).then(docResults => this._responseWrapper.documentCollection(response, docResults), error => this._responseWrapper.exception(response, error));
    }
    retrieveById(request, response) {
        if (this._useEntities)
            this._session.findEntity(this.entityInfo, request.params._id).then(entityResult => this._responseWrapper.entity(response, entityResult), error => this._responseWrapper.exception(response, error));
        else
            this._session.findDocument(this._entityName, request.params._id).then(docResult => this._responseWrapper.document(response, docResult), error => this._responseWrapper.exception(response, error));
    }
    retriveByIdOverInstance(request, response, instance, path) {
    }
    retriveMetadata(request, response, next) {
        this._responseWrapper.object(response, this._session.getMetadataToExpose(this._entityName));
    }
    create(request, response) {
        if (!this._useEntities) {
            this._session.createDocument(this.entityName, request.body).then(result => this._responseWrapper.document(response, result, { status: HttpStatus.CREATED }), error => this._responseWrapper.exception(response, error));
        }
        else
            this.save(request, response);
    }
    update(request, response) {
        if (!this._useEntities) {
            this._session.updateDocument(this._entityName, request.body).then(result => this._responseWrapper.document(response, result, { status: HttpStatus.ACCEPTED }), error => this._responseWrapper.exception(response, error));
        }
        else
            this.save(request, response);
    }
    delete(request, response) {
        let id = request.params._id;
        let responseOk = () => this._responseWrapper.object(response, { 'Delete status': 'register deleted ' });
        let responseError = error => this._responseWrapper.exception(response, responseError);
        if (this._useEntities) {
            this._session.findEntity(this.entityInfo, id).then(entity => {
                entity.delete().then(movFlow => {
                    if (movFlow.continue)
                        responseOk();
                    else
                        this._responseWrapper.logicError(response, movFlow.message, movFlow.details);
                });
            }, error => this._responseWrapper.exception(response, error));
        }
        else {
            this._session.findDocument(this._entityName, request.params._id).then(docResult => this._session.deleteDocument(this._entityName, docResult).then(responseOk, responseError), error => this._responseWrapper.exception(response, error));
        }
    }
    save(request, response) {
        this.validateDocumentRequest(request, response).then((validation) => {
            if (validation) {
                this._session.activateEntityInstance(this.entityInfo, validation.document).then(entity => {
                    entity.save().then(movFlow => {
                        if (movFlow.continue)
                            this._responseWrapper.entity(response, entity, { devData: validation.devData });
                        else
                            this._responseWrapper.logicError(response, movFlow.message, { errorDetails: movFlow.details, devData: validation.devData });
                    }, error => this._responseWrapper.exception(response, error));
                }, error => this._responseWrapper.exception(response, error));
            }
        });
    }
    createRoutes(routerManager) {
        // It is important to consider the order of the class methods setted for the HTTP Methods 
        //Create base routes
        // this._router.get('/' + this._resourceName + '/:path*', ( request, response, next) => this.checkExtendRoutes(request, response, next, routerManager));
        // this._router.get('/' + this._resourceName, ( request, response, next )=> this.retrieve(request, response) );
        // this._router.get('/' + this._resourceName + '/metadata', (request, response, next) => this.retriveMetadata(request, response, next) ); 
        // this._router.get('/' + this._resourceName + '/:_id', (request, response, next) => this.retrieveById( request, response ) );
        // this._router.post('/' + this._resourceName, (request, response, next) => this.create(request, response) );
        // this._router.put('/' + this._resourceName, (request, response, next) => this.update(request, response) );
        // this._router.delete('/' + this._resourceName + '/:_id',(request, response, next) => this.delete(request, response ));
        //METODOS DEPURADOS:
        this._router.get('/' + this._resourceName, (request, response, next) => this.retrieve(request, response));
        this._router.get('/' + this._resourceName + '/:path*', (request, response, next) => this.resolveRetrievePathMethod(request, response, next, routerManager));
    }
    resolveRetrievePathMethod(request, response, next, routerManager) {
        let arrayPath = request.params.path.split('/');
        if (arrayPath.length > 1) {
            let construtorType = this._entityName;
            let instanceKey = arrayPath[0];
            let expositionType;
            let pathOverInstance = new Array();
            let invokeRouterManagerConstruction = false;
            let accesor = this.getExtensionAccessors(expositionType).find(ea => ea.activator.resourcePath == arrayPath[1]);
            if (accesor) {
                expositionType = accesor.className;
                pathOverInstance.push(accesor.name);
                let i = 2;
                while (i < arrayPath.length) {
                    let newAccessorInPath = this.getExtensionAccessors(accesor.className).find(ea => ea.activator.resourcePath == arrayPath[i]);
                    if (newAccessorInPath) {
                        pathOverInstance.push(newAccessorInPath.name);
                        expositionType = newAccessorInPath.className;
                        if (accesor.type == 'array' && accesor.activator.bindingType == hcMetaData_1.MemberBindingType.Reference) {
                            construtorType = accesor.className;
                            instanceKey = arrayPath[i - 1];
                            expositionType = newAccessorInPath.className;
                            pathOverInstance = [newAccessorInPath.name];
                        }
                        accesor = newAccessorInPath;
                    }
                    else {
                        pathOverInstance.push(arrayPath[i]);
                    }
                    i++;
                }
                routerManager.resolveRetrievePath(request, response, construtorType, instanceKey, expositionType, pathOverInstance);
            }
            else {
                next();
            }
        }
        else {
            switch (arrayPath[0]) {
                case 'metadata':
                    this.retriveMetadata(request, response, next);
                    break;
                default:
                    this.retrieveById(request, response);
                    break;
            }
        }
    }
    findEntity(id) {
        return this.session.findEntity(this.entityInfo, id);
    }
    responseOverInstance(response, externalInstance, pathOverInstance) {
        let objectToExpose = externalInstance[pathOverInstance[0]];
        for (let i = 1; i < pathOverInstance.length; i++)
            objectToExpose = objectToExpose[pathOverInstance[i]];
        if (objectToExpose instanceof Array)
            this._responseWrapper.entityCollection(response, objectToExpose);
        else
            this._responseWrapper.entity(response, objectToExpose);
    }
    getExtensionAccessors(entityName) {
        return this.session
            .getInfo(entityName)
            .getAllMembers()
            .filter(memberInfo => memberInfo instanceof hcMetaData_1.AccessorInfo && memberInfo.activator != null && memberInfo.activator.extendRoute == true)
            .map(memberInfo => memberInfo);
    }
    resolveCreateMethod() {
    }
    resolveUpdateMethod() {
    }
    resolveDeleteMethod() {
    }
    checkExtendRoutes(request, response, next, routerManager) {
        let arrayPath = request.path.split('/');
        if (arrayPath.length > 1) {
            let extensionAccessors = this.entityInfo.getAllMembers()
                .filter(memberInfo => memberInfo instanceof hcMetaData_1.AccessorInfo && memberInfo.activator != null && memberInfo.activator.extendRoute == true)
                .map(memberInfo => memberInfo);
            let extensionAccessor = extensionAccessors.find(ea => ea.activator.resourcePath == arrayPath[1]);
            if (extensionAccessor) {
                let tempId = arrayPath[0];
                let controller = routerManager.findController(extensionAccessor.className);
                //RECURSIVIDAD_PARA_OBTENER_LA_INSTANCIA_DEL_OBJETO_MEDIENTE_LA_RUTA
            }
            else
                next();
        }
        else
            next();
    }
    validateQueryParams(request, response) {
        let queryParams = new Array();
        if (request.query != null)
            for (var qp in request.query) {
                switch (qp) {
                    case 'fixed_filter':
                        let addFixedFilter = fv => queryParams.push(new Filter(fv, emSession_1.FilterType.Fixed));
                        let fixedFilterValue = request.query[qp];
                        if (fixedFilterValue instanceof Array)
                            fixedFilterValue.forEach(addFixedFilter);
                        else
                            addFixedFilter(fixedFilterValue);
                        break;
                    case 'optional_filter':
                        let addOptionalFilter = fv => queryParams.push(new Filter(fv, emSession_1.FilterType.Optional));
                        let optionalFilterValue = request.query[qp];
                        if (optionalFilterValue instanceof Array)
                            optionalFilterValue.forEach(addOptionalFilter);
                        else
                            addOptionalFilter(optionalFilterValue);
                        break;
                    case 'order_by':
                        let addSorting = sv => queryParams.push(new Sort(sv));
                        let sortValue = request.query[qp];
                        if (sortValue instanceof Array)
                            sortValue.forEach(addSorting);
                        else
                            addSorting(sortValue);
                        break;
                    case 'skip':
                    case 'take':
                        queryParams.push(new QueryParam(qp, request.query[qp]));
                        break;
                    //To implmente more query params
                    //case <nameparam>:
                    //...
                    //...
                    //  break;
                    default:
                        let details = { message: `Query param not allowed "${qp}"` };
                        this._responseWrapper.handledError(response, 'BAD QUERY PARAM', HttpStatus.BAD_REQUEST, details);
                        return { error: true };
                }
            }
        return { error: false, queryParams };
    }
    validateDocumentRequest(request, response) {
        return new Promise((resolve, reject) => {
            if ((typeof request.body) != 'object')
                return resolve({ error: 'The data provided is not an object', errorData: request });
            let parsedRequest = emEntity_1.EMEntity.deserializeAccessors(this.entityInfo, request.body);
            if (parsedRequest.nonValid)
                return resolve({ error: 'There are non valid values for the resource', errorData: parsedRequest.nonValid });
            let devData = [];
            if (parsedRequest.readOnly)
                devData.push({ message: 'The request has read only accessors and these are going to be ignored', accessors: parsedRequest.readOnly });
            if (parsedRequest.nonPersistent)
                devData.push({ message: 'The request has non persistent accessors and these could be ignored', accessors: parsedRequest.nonPersistent });
            if (parsedRequest.persistent._id) {
                this._session.findDocument(this._entityName, parsedRequest.persistent._id).then(document => {
                    document.set(parsedRequest.persistent);
                    resolve({ document, devData });
                }, err => reject(err));
            }
            else {
                let model = this._session.getModel(this._entityName);
                let document;
                document = new model(parsedRequest.persistent);
                resolve({ document, devData });
            }
        }).then(validation => {
            if (validation.error) {
                let details = {
                    validationError: validation.error,
                    validationDetails: validation.errorData
                };
                this._responseWrapper.handledError(response, 'NOT VALID PAYLOAD FOR THE RESOURCE', HttpStatus.BAD_REQUEST, details);
                return null;
            }
            return validation;
        }, error => this._responseWrapper.exception(response, error));
    }
    //#endregion
    //#region Accessors (Properties)
    get entityInfo() {
        return this._session.getInfo(this._entityName);
    }
    get entityName() { return this._entityName; }
    get session() { return this._session; }
    get useEntities() { return this._useEntities; }
    set useEntities(value) { this._useEntities = value; }
    get router() { return this._router; }
    get responseWrapper() {
        return this._responseWrapper;
    }
    get resourceName() { return this._resourceName; }
}
exports.EMEntityController = EMEntityController;
class QueryParam {
    //#endregion
    //#region Methods
    constructor(paramName, paramValue) {
        this._paramName = paramName;
        this._paramValue = paramValue;
    }
    //#endregion
    //#region Accessors
    get paramName() { return this._paramName; }
    set paramName(value) { this._paramName = value; }
    get paramValue() { return this._paramValue; }
    set paramValue(value) { this._paramValue = value; }
}
class Sort extends QueryParam {
    //#endregion
    //#region Methods
    constructor(paramValue) {
        super('sort', paramValue);
        this.manageValue();
    }
    manageValue() {
        let splitted = this._paramValue.split('|');
        this._property = splitted[0];
        this._sortType = emSession_1.SortType.ascending; // Default value
        if (splitted[1] == 'desc')
            this._sortType = emSession_1.SortType.descending;
    }
    //#endregion
    //#region Accessors
    get property() { return this._property; }
    set property(value) { this._property = value; }
    get sortType() { return this._sortType; }
    set sortType(value) { this._sortType = value; }
}
class Filter extends QueryParam {
    //#endregion
    //#region Methods
    constructor(paramValue, filterType) {
        super('filter', paramValue);
        this._filterType = filterType;
        this.manageValue();
    }
    manageValue() {
        let splitted = this._paramValue.split('|');
        this._property = splitted[0];
        this._operator = splitted[1];
        this._value = splitted[2];
    }
    //#endregion
    //#region Accessors
    get property() { return this._property; }
    set property(value) { this._property = value; }
    get operator() { return this._operator; }
    set operator(value) { this._operator = value; }
    get value() { return this._value; }
    set value(v) { this._value = v; }
    get filterType() { return this._filterType; }
    set filterType(value) { this._filterType = value; }
}
//# sourceMappingURL=emEntityController.js.map