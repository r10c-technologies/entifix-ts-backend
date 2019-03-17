"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const emSession_1 = require("../emSession/emSession");
const emEntityController_1 = require("../emEntityController/emEntityController");
const emWrapper_1 = require("../emWrapper/emWrapper");
const hcWrapper_1 = require("../../hc-core/hcWrapper/hcWrapper");
class IExpositionDetail {
}
class EMRouterManager {
    constructor(serviceSession, exrpressAppInstance, options) {
        this._serviceSession = serviceSession;
        this._expressAppInstance = exrpressAppInstance;
        this._routers = new Array();
        this._basePath = options && options.basePath ? options.basePath : null;
    }
    exposeEntity(entityName, options) {
        let basePath = this.getCompleteBasePath(options && options.basePath ? options.basePath : null);
        let resourceName = options && options.resourceName ? options.resourceName : null;
        let entityController;
        if (options && options.controller)
            entityController = options.controller;
        else
            entityController = new emEntityController_1.EMEntityController(entityName, this, { resourceName });
        this._routers.push({ entityName: entityName, controller: entityController, basePath });
        this._expressAppInstance.use(basePath, entityController.router);
    }
    atachController(controller, options) {
        let basePath = this.getCompleteBasePath(options && options.basePath ? options.basePath : null);
        controller.createRoutes();
        this._expressAppInstance.use(basePath, controller.router);
        this._routers.push({ entityName: null, controller: controller, basePath });
    }
    exposeEnumeration(name, enumerator, options) {
        let basePath = options && options.basePath ? options.basePath : 'api';
        let resourceName = options && options.resourceName ? options.resourceName : name.toLowerCase();
        let newController = new EMSimpleController(this, resourceName);
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
        this._expressAppInstance.use('/' + basePath, newController.router);
        this._routers.push({ entityName: name, controller: newController, basePath });
    }
    resolveComplexRetrieve(session, construtorType, instanceId, expositionAccessorInfo, pathOverInstance) {
        let constructionController = this.findController(construtorType);
        constructionController.findEntity(session, instanceId).then(entity => {
            let objectToExpose = entity[pathOverInstance[0]];
            for (let i = 1; i < pathOverInstance.length; i++) {
                let nexStep = pathOverInstance[i];
                if (objectToExpose instanceof Array)
                    objectToExpose = objectToExpose.find(obj => obj._id.toString() == nexStep);
                else
                    objectToExpose = objectToExpose ? objectToExpose[pathOverInstance[i]] : null;
            }
            let expositionType = expositionAccessorInfo.activator.entityInfo.name;
            let expositionController = this.findController(expositionType);
            let isArray = objectToExpose ? objectToExpose instanceof Array : null;
            if (isArray == null)
                isArray = expositionAccessorInfo.type == 'Array';
            if (isArray)
                expositionController.responseWrapper.entityCollection(session.response, objectToExpose);
            else
                expositionController.responseWrapper.entity(session.response, objectToExpose);
        });
    }
    resolveComplexCreate(session, construtorType, instanceId, expositionAccessorInfo, pathOverInstance) {
        let constructionController = this.findController(construtorType);
        let expositionController = this.findController(expositionAccessorInfo.activator.entityInfo.name);
        constructionController.findEntity(session, instanceId).then(baseEntity => {
            expositionController.createInstance(session.request, session.response, { alwaysNew: true }).then(exEntity => {
                let objectToExpose = baseEntity[pathOverInstance[0]];
                let pathTo = pathOverInstance[0];
                for (let i = 1; i < pathOverInstance.length; i++) {
                    objectToExpose = objectToExpose ? objectToExpose[pathOverInstance[i]] : null;
                    pathTo = pathTo + '.' + pathOverInstance[i];
                }
                if (expositionAccessorInfo.type == 'Array') {
                    if (baseEntity[pathTo] == null)
                        baseEntity[pathTo] = [];
                    baseEntity[pathTo].push(exEntity);
                }
                else
                    baseEntity[pathTo] = exEntity;
                baseEntity.save().then(movFlow => {
                    if (movFlow.continue)
                        expositionController.responseWrapper.entity(session.response, exEntity);
                    else
                        expositionController.responseWrapper.logicError(session.response, movFlow.message);
                }, error => expositionController.responseWrapper.exception(session.response, error));
            });
        }, error => expositionController.responseWrapper.exception(session.response, error));
    }
    resolveComplexUpdate(session, construtorType, instanceId, expositionAccessorInfo, pathOverInstance) {
        let constructionController = this.findController(construtorType);
        let expositionController = this.findController(expositionAccessorInfo.activator.entityInfo.name);
        constructionController.findEntity(session, instanceId).then(baseEntity => {
            expositionController.createInstance(session.request, session.response, { alwaysNew: true }).then(exEntity => {
                let objectToExpose = baseEntity[pathOverInstance[0]];
                let pathTo = pathOverInstance[0];
                for (let i = 1; i < pathOverInstance.length; i++) {
                    objectToExpose = objectToExpose ? objectToExpose[pathOverInstance[i]] : null;
                    pathTo = pathTo + '.' + pathOverInstance[i];
                }
                if (expositionAccessorInfo.type == 'Array') {
                    let index = baseEntity[pathTo].findIndex(e => e._id == exEntity._id);
                    baseEntity[pathTo].splice(index, 1);
                    baseEntity[pathTo].push(exEntity);
                }
                else
                    baseEntity[pathTo] = exEntity;
                baseEntity.save().then(movFlow => {
                    if (movFlow.continue)
                        expositionController.responseWrapper.entity(session.response, exEntity);
                    else
                        expositionController.responseWrapper.logicError(session.response, movFlow.message);
                }, error => expositionController.responseWrapper.exception(session.response, error));
            });
        }, error => expositionController.responseWrapper.exception(session.response, error));
    }
    resolveComplexDelete(session, construtorType, instanceId, expositionAccessorInfo, pathOverInstance) {
        let constructionController = this.findController(construtorType);
        let expositionController = this.findController(expositionAccessorInfo.activator.entityInfo.name);
        constructionController.findEntity(session, instanceId).then(baseEntity => {
            expositionController.createInstance(session.request, session.response, { alwaysNew: true }).then(exEntity => {
                let objectToExpose = baseEntity[pathOverInstance[0]];
                let pathTo = pathOverInstance[0];
                for (let i = 1; i < pathOverInstance.length; i++) {
                    objectToExpose = objectToExpose[pathOverInstance[i]];
                    pathTo = pathTo + '.' + pathOverInstance[i];
                }
                if (expositionAccessorInfo.type == 'Array') {
                    let index = baseEntity[pathTo].findIndex(e => e._id == exEntity._id);
                    baseEntity[pathTo].splice(index, 1);
                }
                else
                    baseEntity[pathTo] = exEntity;
                baseEntity.save().then(movFlow => {
                    if (movFlow.continue)
                        expositionController.responseWrapper.entity(session.response, exEntity);
                    else
                        expositionController.responseWrapper.logicError(session.response, movFlow.message);
                }, error => expositionController.responseWrapper.exception(session.response, error));
            });
        }, error => expositionController.responseWrapper.exception(session.response, error));
    }
    getExpositionDetails() {
        return this._routers.map(r => { return { entityName: r.entityName, resourceName: r.controller.resourceName, basePath: r.basePath }; });
    }
    findController(entityName) {
        return this._routers.find(ed => ed.entityName == entityName).controller;
    }
    getCompleteBasePath(postFix) {
        let completeBasePath = '/';
        if (this._basePath)
            completeBasePath += this._basePath + '/';
        completeBasePath += postFix || 'api';
        return completeBasePath;
    }
    //#endregion
    //#regrion Accessors (Properties)
    get serviceSession() {
        return this._serviceSession;
    }
    get expressAppInstance() {
        return this._expressAppInstance;
    }
    get basePath() {
        return this._basePath;
    }
}
exports.EMRouterManager = EMRouterManager;
class EMSimpleController {
    //#endregion
    //#region Methods
    constructor(routerManager, resourceName) {
        this._resourceName = resourceName;
        this._routerManager = routerManager;
        this._responseWrapper = new emWrapper_1.EMResponseWrapper(routerManager.serviceSession);
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
    createSession(request, response) {
        let responseWithException = error => {
            let e = this._routerManager.serviceSession.createError(error, 'Error on create session for the request');
            this._responseWrapper.exception(response, e);
        };
        return new Promise((resolve, reject) => {
            let newSession = new emSession_1.EMSession(this._routerManager.serviceSession, { request, response });
            //Execute another async tasks before using the new session
            //...
            //...
            //...
            resolve(newSession);
        })
            .then(session => session)
            .catch(error => responseWithException(error));
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
    get responseWrapper() {
        return this._responseWrapper;
    }
    get resouceName() { return this._resourceName; }
}
exports.EMSimpleController = EMSimpleController;
//# sourceMappingURL=emRouterManager.js.map