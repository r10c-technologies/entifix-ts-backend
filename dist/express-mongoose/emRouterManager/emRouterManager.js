"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const emEntityController_1 = require("../emEntityController/emEntityController");
const hcWrapper_1 = require("../../hc-core/hcWrapper/hcWrapper");
class IExpositionDetail {
}
class EMRouterManager {
    //#endregion
    //#regrion Methods
    constructor(session, appInstance) {
        this._session = session;
        this._appInstance = appInstance;
        this._routers = new Array();
    }
    exposeEntity(entityName, options) {
        let basePath = options && options.basePath ? options.basePath : 'api';
        let resourceName = options && options.resourceName ? options.resourceName : null;
        let entityController;
        if (options && options.controller)
            entityController = options.controller;
        else
            entityController = new emEntityController_1.EMEntityController(entityName, this._session, resourceName);
        entityController.createRoutes(this);
        this._routers.push({ entityName: entityName, controller: entityController, basePath });
        this._appInstance.use('/' + basePath, entityController.router);
    }
    exposeEnumeration(name, enumerator, options) {
        let basePath = options && options.basePath ? options.basePath : 'api';
        let resourceName = options && options.resourceName ? options.resourceName : name.toLowerCase();
        let newController = new EMSimpleController(resourceName);
        let keys = Object.keys(enumerator);
        let arrayToExpose = new Array();
        keys.forEach(k => {
            if (arrayToExpose.find(pair => pair.value == k) == null)
                arrayToExpose.push({ id: k, value: enumerator[k] });
        });
        newController.retrieveMethod = (req, res, next) => {
            res.send(hcWrapper_1.Wrapper.wrapCollection(false, null, arrayToExpose).serializeSimpleObject());
        };
        newController.retrieveByIdMethod = (req, res, next) => {
            let id = req.params._id;
            let objectToExpose = arrayToExpose.find(v => v.id == id);
            res.send(hcWrapper_1.Wrapper.wrapObject(false, null, objectToExpose).serializeSimpleObject());
        };
        newController.createRoutes();
        this._appInstance.use('/' + basePath, newController.router);
        this._routers.push({ entityName: name, controller: newController, basePath });
    }
    resolveComplexRetrieve(request, response, construtorType, instanceId, expositionType, pathOverInstance) {
        let constructionController = this.findController(construtorType);
        let expositionController = this.findController(expositionType);
        constructionController.findEntity(instanceId).then(entity => {
            let objectToExpose = entity[pathOverInstance[0]];
            for (let i = 1; i < pathOverInstance.length; i++)
                objectToExpose = objectToExpose[pathOverInstance[i]];
            if (objectToExpose instanceof Array)
                expositionController.responseWrapper.entityCollection(response, objectToExpose);
            else
                expositionController.responseWrapper.entity(response, objectToExpose);
        });
    }
    resolveComplexCreate(request, response, construtorType, instanceId, expositionType, pathOverInstance) {
        let constructionController = this.findController(construtorType);
        let expositionController = this.findController(expositionType);
        constructionController.findEntity(instanceId).then(baseEntity => {
            expositionController.createInstance(request, response).then(exEntity => {
                let objectToExpose = baseEntity[pathOverInstance[0]];
                let pathTo = pathOverInstance[0];
                for (let i = 1; i < pathOverInstance.length; i++) {
                    objectToExpose = objectToExpose[pathOverInstance[i]];
                    pathTo = pathTo + '.' + pathOverInstance[i];
                }
                if (objectToExpose instanceof Array)
                    baseEntity[pathTo].push(exEntity);
                else
                    baseEntity[pathTo] = exEntity;
                baseEntity.save().then(movFlow => {
                    if (movFlow.continue)
                        expositionController.responseWrapper.entity(response, exEntity);
                    else
                        expositionController.responseWrapper.logicError(response, movFlow.message);
                }, error => expositionController.responseWrapper.exception(response, error));
            });
        }, error => expositionController.responseWrapper.exception(response, error));
    }
    resolveComplexUpdate(request, response, construtorType, instanceId, expositionType, pathOverInstance) {
        let constructionController = this.findController(construtorType);
        let expositionController = this.findController(expositionType);
        constructionController.findEntity(instanceId).then(baseEntity => {
            expositionController.createInstance(request, response).then(exEntity => {
                let objectToExpose = baseEntity[pathOverInstance[0]];
                let pathTo = pathOverInstance[0];
                for (let i = 1; i < pathOverInstance.length; i++) {
                    objectToExpose = objectToExpose[pathOverInstance[i]];
                    pathTo = pathTo + '.' + pathOverInstance[i];
                }
                if (objectToExpose instanceof Array) {
                    let index = baseEntity[pathTo].findIndex(e => e._id == exEntity._id);
                    baseEntity[pathTo].splice(index, 1);
                    baseEntity[pathTo].push(exEntity);
                }
                else
                    baseEntity[pathTo] = exEntity;
                baseEntity.save().then(movFlow => {
                    if (movFlow.continue)
                        expositionController.responseWrapper.entity(response, exEntity);
                    else
                        expositionController.responseWrapper.logicError(response, movFlow.message);
                }, error => expositionController.responseWrapper.exception(response, error));
            });
        }, error => expositionController.responseWrapper.exception(response, error));
    }
    resolveComplexDelete(request, response, construtorType, instanceId, expositionType, pathOverInstance) {
        let constructionController = this.findController(construtorType);
        let expositionController = this.findController(expositionType);
        constructionController.findEntity(instanceId).then(baseEntity => {
            expositionController.createInstance(request, response).then(exEntity => {
                let objectToExpose = baseEntity[pathOverInstance[0]];
                let pathTo = pathOverInstance[0];
                for (let i = 1; i < pathOverInstance.length; i++) {
                    objectToExpose = objectToExpose[pathOverInstance[i]];
                    pathTo = pathTo + '.' + pathOverInstance[i];
                }
                if (objectToExpose instanceof Array) {
                    let index = baseEntity[pathTo].findIndex(e => e._id == exEntity._id);
                    baseEntity[pathTo].splice(index, 1);
                }
                else
                    baseEntity[pathTo] = exEntity;
                baseEntity.save().then(movFlow => {
                    if (movFlow.continue)
                        expositionController.responseWrapper.entity(response, exEntity);
                    else
                        expositionController.responseWrapper.logicError(response, movFlow.message);
                }, error => expositionController.responseWrapper.exception(response, error));
            });
        }, error => expositionController.responseWrapper.exception(response, error));
    }
    getExpositionDetails() {
        return this._routers.map(r => { return { entityName: r.entityName, resourceName: r.controller.resourceName, basePath: r.basePath }; });
    }
    findController(entityName) {
        return this._routers.find(ed => ed.entityName == entityName).controller;
    }
    //#endregion
    //#regrion Accessors (Properties)
    get session() {
        return this._session;
    }
    get appInstance() {
        return this._appInstance;
    }
}
exports.EMRouterManager = EMRouterManager;
class EMSimpleController {
    //#endregion
    //#region Methods
    constructor(resourceName) {
        this._resourceName = resourceName;
    }
    createRoutes() {
        this._router = express.Router();
        if (this._retrieveByIdMethod)
            this._router.get('/' + this._resourceName + '/:_id', (request, response, next) => this._retrieveByIdMethod(request, response, next));
        if (this._retrieveMethod)
            this._router.get('/' + this._resourceName, (request, response, next) => this._retrieveMethod(request, response, next));
        if (this._createMethod)
            this._router.post('/' + this._resourceName, (request, response, next) => this._createMethod(request, response, next));
        if (this._updateMethod)
            this._router.put('/' + this._resourceName, (request, response, next) => this._updateMethod(request, response, next));
        if (this._deleteMethod)
            this._router.delete('/' + this._resourceName + '/:_id', (request, response, next) => this._deleteMethod(request, response, next));
    }
    //#endregion
    //#region Accessors
    get router() { return this._router; }
    get retrieveMethod() { return this._retrieveMethod; }
    set retrieveMethod(value) { this._retrieveMethod = value; }
    get retrieveByIdMethod() { return this._retrieveByIdMethod; }
    set retrieveByIdMethod(value) { this._retrieveByIdMethod = value; }
    get createMethod() { return this._createMethod; }
    set createMethod(value) { this._createMethod = value; }
    get updateMethod() { return this._updateMethod; }
    set updateMethod(value) { this._updateMethod = value; }
    get deleteMethod() { return this._deleteMethod; }
    set deleteMethod(value) { this._deleteMethod = value; }
}
exports.EMSimpleController = EMSimpleController;
//# sourceMappingURL=emRouterManager.js.map