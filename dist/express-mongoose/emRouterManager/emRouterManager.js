"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const mongoose = require("mongoose");
const gridfs = require("gridfs-stream");
const fs = require("fs");
const HttpStatus = require("http-status-codes");
const emSession_1 = require("../emSession/emSession");
const emEntityController_1 = require("../emEntityController/emEntityController");
const emEntity_1 = require("../emEntity/emEntity");
const emWrapper_1 = require("../emWrapper/emWrapper");
const hcWrapper_1 = require("../../hc-core/hcWrapper/hcWrapper");
const hcMetaData_1 = require("../../hc-core/hcMetaData/hcMetaData");
const emEntityMultiKeyController_1 = require("../emEntityMultikeyController/emEntityMultiKeyController");
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
        let entityController = options && options.controller ? options.controller : null;
        if (!entityController)
            entityController = new emEntityController_1.EMEntityController(entityName, this, { resourceName });
        this._routers.push({ entityName: entityName, controller: entityController, basePath });
        this._expressAppInstance.use(basePath, entityController.router);
    }
    exposeEntityMultiKey(entityName, options) {
        options = options || {};
        let resourceName = options && options.resourceName ? options.resourceName : null;
        if (!options.controller)
            options.controller = new emEntityMultiKeyController_1.EMEntityMutltiKeyController(entityName, this, { resourceName });
        this.exposeEntity(entityName, options);
    }
    atachController(controller, options) {
        let basePath = this.getCompleteBasePath(options && options.basePath ? options.basePath : null);
        controller.createRoutes();
        this._expressAppInstance.use(basePath, controller.router);
        this._routers.push({ entityName: null, controller: controller, basePath });
    }
    exposeEnumeration(name, enumerator, options) {
        let basePath = this.getCompleteBasePath(options && options.basePath ? options.basePath : null);
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
        this._expressAppInstance.use(basePath, newController.router);
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
            if (expositionAccessorInfo.activator.bindingType == hcMetaData_1.MemberBindingType.Chunks) {
                if (objectToExpose instanceof Array) {
                    constructionController.responseWrapper.object(session.response, objectToExpose);
                }
                else {
                    let fileCollection = session.systemOwner.toLowerCase();
                    let idFile = objectToExpose ? objectToExpose._id : null;
                    let fileName = objectToExpose.name;
                    let gfs = gridfs(session.serviceSession.mongooseConnection.db, mongoose.mongo);
                    gfs.exist({ root: fileCollection, _id: idFile }, function (err, result) {
                        if (!err && result) {
                            let readstream = gfs.createReadStream({ root: fileCollection, _id: idFile });
                            readstream.pipe(session.response).attachment(fileName);
                        }
                        else {
                            constructionController.responseWrapper.logicError(session.response, "The file does not exist in database");
                        }
                    });
                }
            }
            else {
                let expositionType = expositionAccessorInfo.activator.entityInfo.name;
                let expositionController = this.findController(expositionType);
                let isArray = objectToExpose ? objectToExpose instanceof Array : null;
                if (isArray == null)
                    isArray = expositionAccessorInfo.type == 'Array';
                if (isArray)
                    expositionController.responseWrapper.entityCollection(session.response, objectToExpose);
                else
                    expositionController.responseWrapper.entity(session.response, objectToExpose);
            }
        });
    }
    resolveComplexCreate(session, construtorType, instanceId, expositionAccessorInfo, pathOverInstance) {
        let constructionController = this.findController(construtorType);
        let expositionController;
        let validateReqBody;
        let sendException = error => constructionController.responseWrapper.exception(session.response, error);
        switch (expositionAccessorInfo.activator.bindingType) {
            case hcMetaData_1.MemberBindingType.Reference:
            case hcMetaData_1.MemberBindingType.Snapshot:
                validateReqBody = () => {
                    expositionController = this.findController(expositionAccessorInfo.activator.entityInfo.name);
                    return expositionController.createInstance(session.request, session.response, { alwaysNew: true });
                };
                break;
            case hcMetaData_1.MemberBindingType.Chunks:
                validateReqBody = () => this.genericValidation(session.request, { bindingType: hcMetaData_1.MemberBindingType.Chunks });
                break;
        }
        constructionController.findEntity(session, instanceId).then(baseEntity => {
            validateReqBody().then(result => {
                let objectToExpose = baseEntity[pathOverInstance[0]];
                let pathTo = pathOverInstance[0];
                let fileEntity = {};
                let saveBaseEntity = (objectToSend) => {
                    baseEntity.save().then(movFlow => {
                        if (movFlow.continue) {
                            if (objectToSend instanceof emEntity_1.EMEntity)
                                constructionController.responseWrapper.entity(session.response, objectToSend);
                            else
                                constructionController.responseWrapper.object(session.response, objectToSend);
                        }
                        else
                            constructionController.responseWrapper.logicError(session.response, movFlow.message);
                    }, error => constructionController.responseWrapper.exception(session.response, error));
                };
                for (let i = 1; i < pathOverInstance.length; i++) {
                    objectToExpose = objectToExpose ? objectToExpose[pathOverInstance[i]] : null;
                    pathTo = pathTo + '.' + pathOverInstance[i];
                }
                if (result instanceof emEntity_1.EMEntity) {
                    if (expositionAccessorInfo.type == 'Array') {
                        if (baseEntity[pathTo] == null)
                            baseEntity[pathTo] = [];
                        baseEntity[pathTo].push(result);
                    }
                    else
                        baseEntity[pathTo] = result;
                }
                else {
                    if (!result.error) {
                        this.saveEntityChunkMember(session, expositionAccessorInfo, pathOverInstance, baseEntity, construtorType, pathTo, 'create', result.data.fileKey).then((f) => {
                            saveBaseEntity(f);
                        }).catch(e => constructionController.responseWrapper.exception(session.response, e));
                    }
                    else {
                        constructionController.responseWrapper.handledError(session.response, result.error, HttpStatus.BAD_REQUEST);
                    }
                }
            }).catch(sendException);
        }).catch(sendException);
    }
    resolveComplexUpdate(session, construtorType, instanceId, expositionAccessorInfo, pathOverInstance) {
        let constructionController = this.findController(construtorType);
        let expositionController;
        let validateReqBody;
        let sendException = error => constructionController.responseWrapper.exception(session.response, error);
        switch (expositionAccessorInfo.activator.bindingType) {
            case hcMetaData_1.MemberBindingType.Reference:
            case hcMetaData_1.MemberBindingType.Snapshot:
                validateReqBody = () => {
                    expositionController = this.findController(expositionAccessorInfo.activator.entityInfo.name);
                    return expositionController.createInstance(session.request, session.response, { alwaysNew: true });
                };
                break;
            case hcMetaData_1.MemberBindingType.Chunks:
                validateReqBody = () => this.genericValidation(session.request, { bindingType: hcMetaData_1.MemberBindingType.Chunks, method: "update" });
                break;
        }
        constructionController.findEntity(session, instanceId).then(baseEntity => {
            validateReqBody().then(result => {
                let objectToExpose = baseEntity[pathOverInstance[0]];
                let pathTo = pathOverInstance[0];
                let saveBaseEntity = (objectToSend) => {
                    baseEntity.save().then(movFlow => {
                        if (movFlow.continue) {
                            if (objectToSend instanceof emEntity_1.EMEntity)
                                constructionController.responseWrapper.entity(session.response, objectToSend);
                            else
                                constructionController.responseWrapper.object(session.response, objectToSend);
                        }
                        else
                            constructionController.responseWrapper.logicError(session.response, movFlow.message);
                    }, error => constructionController.responseWrapper.exception(session.response, error));
                };
                for (let i = 1; i < pathOverInstance.length; i++) {
                    objectToExpose = objectToExpose ? objectToExpose[pathOverInstance[i]] : null;
                    pathTo = pathTo + '.' + pathOverInstance[i];
                }
                if (result instanceof emEntity_1.EMEntity) {
                    if (expositionAccessorInfo.type == 'Array') {
                        let index = baseEntity[pathTo].findIndex(e => e._id == result._id);
                        baseEntity[pathTo].splice(index, 1);
                        baseEntity[pathTo].push(result);
                    }
                    else
                        baseEntity[pathTo] = result;
                    saveBaseEntity(result);
                }
                else {
                    if (!result.error && result.data.fileKey) {
                        this.saveEntityChunkMember(session, expositionAccessorInfo, pathOverInstance, baseEntity, construtorType, pathTo, 'update', result.data.fileKey).then((f) => {
                            saveBaseEntity(f);
                        }).catch(e => constructionController.responseWrapper.exception(session.response, e));
                    }
                    else {
                        constructionController.responseWrapper.handledError(session.response, result.error, HttpStatus.BAD_REQUEST);
                    }
                }
            }).catch(sendException);
        }).catch(sendException);
    }
    saveEntityChunkMember(session, expositionAccessorInfo, pathOverInstance, baseEntity, constructorType, pathTo, option, fileKey) {
        return new Promise((resolve, reject) => {
            let constructionController = this.findController(constructorType);
            let id;
            let file;
            let mimetype;
            let filename;
            ;
            let filePath;
            let fileSize;
            let fileEntity;
            let member = expositionAccessorInfo.persistentAlias ? expositionAccessorInfo.persistentAlias : expositionAccessorInfo.name;
            let fileCollection = session.systemOwner.toLowerCase();
            if (option != 'create') {
                id = expositionAccessorInfo.type == 'Array' ? pathOverInstance[pathOverInstance.length - 1] : baseEntity[member]._id;
            }
            if (option != 'delete') {
                file = session.request.files[fileKey];
                mimetype = file.mimetype;
                filename = file.name;
                filePath = file.tempFilePath;
                fileSize = file.size;
                fileEntity = {
                    _id: "",
                    name: filename,
                    fileExtension: mimetype,
                    size: fileSize
                };
            }
            let gfs = gridfs(session.serviceSession.mongooseConnection.db, mongoose.mongo);
            switch (option) {
                case 'create':
                    {
                        let writestream = gfs.createWriteStream({ filename, content_type: mimetype, root: fileCollection });
                        fs.createReadStream(filePath).pipe(writestream);
                        writestream.on('close', function (file) {
                            fileEntity._id = file._id.toString();
                            if (expositionAccessorInfo.type == 'Array') {
                                (baseEntity[pathTo]).push(fileEntity);
                            }
                            else {
                                baseEntity[pathTo] = fileEntity;
                            }
                            fileEntity = file;
                            resolve(fileEntity);
                        });
                        break;
                    }
                case 'update':
                    {
                        gfs.exist({ root: fileCollection, _id: id }, function (err, result) {
                            if (!err && result) {
                                gfs.remove({ root: fileCollection, _id: id }, function (err) {
                                    if (!err) {
                                        let writestream = gfs.createWriteStream({ root: fileCollection, _id: id, filename, content_type: mimetype });
                                        fs.createReadStream(filePath).pipe(writestream);
                                        writestream.on('close', function (file) {
                                            fileEntity._id = file._id.toString();
                                            if (expositionAccessorInfo.type == 'Array') {
                                                let index = (baseEntity[member]).findIndex(e => e._id == file._id.toString());
                                                (baseEntity[member]).splice(index, 1);
                                                (baseEntity[member]).push(fileEntity);
                                            }
                                            else {
                                                baseEntity[pathTo] = fileEntity;
                                            }
                                            resolve(fileEntity);
                                        });
                                    }
                                });
                            }
                            else {
                                constructionController.responseWrapper.handledError(session.response, "File not found on database", HttpStatus.BAD_REQUEST);
                            }
                        });
                        break;
                    }
                case 'delete':
                    {
                        gfs.exist({ _id: id, root: fileCollection }, function (err, file) {
                            if (!err || file) {
                                gfs.remove({ _id: id, root: fileCollection }, function (err) {
                                    if (!err) {
                                        if (expositionAccessorInfo.type == 'Array') {
                                            let index = (baseEntity[member]).findIndex(e => e._id == id);
                                            (baseEntity[member]).splice(index, 1);
                                        }
                                        else {
                                            baseEntity[member] = null;
                                        }
                                        resolve(fileEntity);
                                    }
                                });
                            }
                            else {
                                constructionController.responseWrapper.logicError(session.response, "The file does not exists");
                            }
                        });
                        break;
                    }
            }
        });
    }
    resolveComplexDelete(session, construtorType, instanceId, expositionAccessorInfo, pathOverInstance) {
        let constructionController = this.findController(construtorType);
        let expositionController;
        let validateReqBody;
        let sendException = error => constructionController.responseWrapper.exception(session.response, error);
        switch (expositionAccessorInfo.activator.bindingType) {
            case hcMetaData_1.MemberBindingType.Reference:
            case hcMetaData_1.MemberBindingType.Snapshot:
                validateReqBody = () => {
                    expositionController = this.findController(expositionAccessorInfo.activator.entityInfo.name);
                    return expositionController.createInstance(session.request, session.response, { alwaysNew: true });
                };
                break;
            case hcMetaData_1.MemberBindingType.Chunks:
                validateReqBody = () => this.genericValidation(session.request, { bindingType: hcMetaData_1.MemberBindingType.Chunks, method: "delete" });
                break;
        }
        constructionController.findEntity(session, instanceId).then(baseEntity => {
            validateReqBody().then(result => {
                let objectToExpose = baseEntity[pathOverInstance[0]];
                let pathTo = pathOverInstance[0];
                let saveBaseEntity = (objectToSend) => {
                    baseEntity.save().then(movFlow => {
                        if (movFlow.continue) {
                            if (objectToSend instanceof emEntity_1.EMEntity)
                                constructionController.responseWrapper.entity(session.response, objectToSend);
                            else
                                constructionController.responseWrapper.object(session.response, objectToSend);
                        }
                        else
                            constructionController.responseWrapper.logicError(session.response, movFlow.message);
                    }, error => constructionController.responseWrapper.exception(session.response, error));
                };
                for (let i = 1; i < pathOverInstance.length; i++) {
                    objectToExpose = objectToExpose ? objectToExpose[pathOverInstance[i]] : null;
                    pathTo = pathTo + '.' + pathOverInstance[i];
                }
                if (result instanceof emEntity_1.EMEntity) {
                    if (expositionAccessorInfo.type == 'Array') {
                        let index = baseEntity[pathTo].findIndex(e => e._id == result._id);
                        baseEntity[pathTo].splice(index, 1);
                    }
                    else
                        baseEntity[pathTo] = result;
                }
                else {
                    if (!result.error && result.data.ok) {
                        this.saveEntityChunkMember(session, expositionAccessorInfo, pathOverInstance, baseEntity, construtorType, pathTo, 'delete').then((f) => {
                            saveBaseEntity(f);
                        }).catch(e => constructionController.responseWrapper.exception(session.response, e));
                    }
                    else {
                        constructionController.responseWrapper.handledError(session.response, result.error, HttpStatus.BAD_REQUEST);
                    }
                }
            }).catch(sendException);
        }).catch(sendException);
    }
    getExpositionDetails() {
        return this._routers.map(r => { return { entityName: r.entityName, resourceName: r.controller.resourceName, basePath: r.basePath }; });
    }
    findController(entityName) {
        return this._routers.find(ed => ed.entityName == entityName).controller;
    }
    genericValidation(request, options) {
        return new Promise((resolve, reject) => {
            //Implement more types of validations
            //...
            //...
            //::
            if (options && options.bindingType == hcMetaData_1.MemberBindingType.Chunks) {
                if (request.files && Object.keys(request.files).length > 0) {
                    let properties = Object.keys(request.files);
                    let fileKey = properties[0];
                    resolve({ data: { fileKey: fileKey } });
                }
                else if (options.method && options.method == 'delete') {
                    resolve({ data: { ok: true } });
                }
                else {
                    resolve({ error: 'File Handle Error' });
                }
            }
            else {
            }
        });
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