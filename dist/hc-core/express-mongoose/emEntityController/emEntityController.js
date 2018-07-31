"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emSession_1 = require("../emSession/emSession");
const emWrapper_1 = require("../emWrapper/emWrapper");
const HttpStatus = require("http-status-codes");
const express = require("express");
class EMEntityController {
    //#endregion
    //#region Methods
    constructor(entityName, session) {
        this._entityName = entityName;
        this._session = session;
        this._useEntities = true;
        this._responseWrapper = new emWrapper_1.EMResponseWrapper();
        this.constructRouter();
    }
    retrieve(request, response) {
        //Manage query params options
        let queryParamsConversion = this.getQueryParams(request);
        if (queryParamsConversion.error)
            this.responseWrapper.error(response, queryParamsConversion.message, 400);
        let queryParams = queryParamsConversion.queryParams;
        let filterParam = queryParams.filter(qp => qp.paramName == 'filter');
        let filters = filterParam.length > 0 ? filterParam.map(qp => qp) : null;
        let sortParam = queryParams.filter(qp => qp.paramName == 'sort');
        let sorting = sortParam.length > 0 ? sortParam.map(qp => qp) : null;
        let skipParam = queryParams.find(qp => qp.paramName == 'skip');
        let skip = skipParam != null ? parseInt(skipParam.paramValue) : null;
        let takeParam = queryParams.find(qp => qp.paramName == 'take');
        let take = takeParam != null ? parseInt(takeParam.paramValue) : 100;
        //Call the execution of mongo query in EMSession
        this._session.listDocuments(this._entityName, { filters, skip, take, sorting })
            .then(results => {
            if (this._useEntities)
                this._responseWrapper.entityCollection(response, results.map(e => this._session.activateEntityInstance(this._entityName, e)));
            else
                this._responseWrapper.documentCollection(response, results);
        }, error => this._responseWrapper.sessionError(response, error));
    }
    retrieveById(request, response) {
        this._session.findDocument(this._entityName, request.params._id).then(result => {
            if (this.useEntities)
                this._responseWrapper.entity(response, this._session.activateEntityInstance(this._entityName, result));
            else
                this._responseWrapper.document(response, result);
        }, error => this._responseWrapper.sessionError(response, error));
    }
    retriveMetadata(request, response, next) {
        this._responseWrapper.object(response, this._session.getMetadataToExpose(this._entityName));
    }
    create(request, response) {
        if (!this._useEntities) {
            this._session.createDocument(this.entityName, request.body).then(result => this._responseWrapper.document(response, result, HttpStatus.CREATED), error => this._responseWrapper.sessionError(response, error));
        }
        else
            this.save(request, response);
    }
    update(request, response) {
        if (!this._useEntities) {
            this._session.updateDocument(this._entityName, request.body).then(result => this._responseWrapper.document(response, result, HttpStatus.OK), error => this._responseWrapper.sessionError(response, error));
        }
        else
            this.save(request, response);
    }
    delete(request, response) {
        this._session.findDocument(this._entityName, request.params._id).then(result => {
            let responseOk = () => this._responseWrapper.object(response, { 'Delete status': 'register deleted ' });
            let responseError = error => this._responseWrapper.sessionError(response, responseError);
            if (this._useEntities) {
                let entity = this._session.activateEntityInstance(this._entityName, result);
                entity.delete().then(movFlow => {
                    if (movFlow.continue)
                        responseOk();
                    else
                        this._responseWrapper.logicError(response, movFlow.message, movFlow.details);
                }, responseError);
            }
            else
                this._session.deleteDocument(this.entityName, result).then(responseOk, responseError);
        }, error => this._responseWrapper.sessionError(response, error));
    }
    save(request, response) {
        let entity = this._session.activateEntityInstance(this._entityName, request.body);
        entity.save().then(movFlow => {
            if (movFlow.continue)
                this._responseWrapper.entity(response, entity);
            else
                this._responseWrapper.logicError(response, movFlow.message, movFlow.details);
        }, error => this._responseWrapper.sessionError(response, error));
    }
    constructRouter() {
        this._resourceName = '/' + this._entityName.toLowerCase();
        this._router = express.Router();
        this.defineRoutes();
    }
    defineRoutes() {
        // It is important to consider the order of the class methods setted for the HTTP Methods 
        this._router.get(this._resourceName, (request, response, next) => this.retrieve(request, response));
        this._router.get(this._resourceName + '/metadata', (request, response, next) => this.retriveMetadata(request, response, next));
        this._router.get(this._resourceName + '/:_id', (request, response, next) => this.retrieveById(request, response));
        this._router.post(this._resourceName, (request, response, next) => this.create(request, response));
        this._router.put(this._resourceName, (request, response, next) => this.update(request, response));
        this._router.delete(this._resourceName + '/:_id', (request, response, next) => this.delete(request, response));
    }
    getQueryParams(request) {
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
                        return { error: true, message: `Query param not allowed "${qp}"` };
                }
            }
        return { error: false, queryParams };
    }
    //#endregion
    //#region Accessors (Properties)
    get entityName() { return this._entityName; }
    get session() { return this._session; }
    get useEntities() { return this._useEntities; }
    set useEntities(value) { this._useEntities = value; }
    get router() { return this._router; }
    get responseWrapper() {
        return this._responseWrapper;
    }
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