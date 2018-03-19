"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
        this._session.listDocuments(this._entityName).then(results => {
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
                entity.delete().then(responseOk, responseError);
            }
            else
                this._session.deleteDocument(this.entityName, result).then(responseOk, responseError);
        }, error => this._responseWrapper.sessionError(response, error));
    }
    save(request, response) {
        let entity = this._session.activateEntityInstance(this._entityName, request.body);
        entity.save().then(result => this._responseWrapper.entity(response, entity), error => this._responseWrapper.sessionError(response, error));
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
//# sourceMappingURL=emEntityController.js.map