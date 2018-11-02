"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//CORE DEPENDENCIES
const mongoose = require("mongoose");
//CORE FRAMEWORK
const amqpConnectionDynamic_1 = require("../emServiceSession/amqpConnectionDynamic");
class EMServiceSession {
    constructor(mongoService, amqpService) {
        this._entitiesInfo = [];
        //Mongo Configuration
        this._urlMongoConnection = 'mongodb://' + mongoService;
        //AMQP Configuration
        if (amqpService) {
            this._urlAmqpConnection = 'amqp://' + amqpService;
            //defaluts
            this._limitAmqpRetry = 10;
            this._periodAmqpRetry = 2000;
        }
    }
    connect() {
        let connectDb = () => { this._mongooseConnection = mongoose.createConnection(this._urlMongoConnection); };
        if (this._urlAmqpConnection) {
            connectDb();
            return this.atachToBroker();
        }
        else
            return new Promise((resolve, reject) => {
                connectDb();
                resolve();
            });
    }
    atachToBroker() {
        return new Promise((resolve, reject) => {
            amqpConnectionDynamic_1.AMQPConnectionDynamic.connect(this._urlAmqpConnection, { period: this._periodAmqpRetry, limit: this._limitAmqpRetry }).then(connection => {
                this._brokerConnection = connection;
                amqpConnectionDynamic_1.AMQPConnectionDynamic.createExchangeAndQueues(connection, this._amqpExchangesDescription, this._amqpQueueBindsDescription).then(channel => {
                    this._brokerChannel = channel;
                    resolve();
                }, error => reject(error));
            }, error => reject(error));
        });
    }
    getInfo(entityName) {
        let infoRegister = this._entitiesInfo.find(e => e.name == entityName);
        if (!infoRegister)
            this.throwException('Entity not registered: ' + entityName);
        return infoRegister.info;
    }
    getModel(entityName, systemOwner) {
        let infoRegister = this._entitiesInfo.find(e => e.name == entityName);
        if (!infoRegister)
            this.throwException('Entity not registered: ' + entityName);
        if (this.isDevMode && !systemOwner)
            systemOwner = 'DEVELOPER';
        let modelRegister = infoRegister.models.find(m => m.systemOwner == systemOwner);
        if (!modelRegister)
            this.throwException(`Model ${entityName} not registered for System Owner ${systemOwner}`);
        return modelRegister.model;
    }
    registerEntity(type, entityInfo) {
        var structureSchema = entityInfo.getCompleteSchema();
        var entityName = entityInfo.name;
        if (this.entitiesInfo.filter(e => e.name == entityName).length == 0) {
            var schema;
            var model;
            schema = new mongoose.Schema(structureSchema);
            this._entitiesInfo.push({
                name: entityName,
                info: entityInfo,
                schema: schema,
                models: [],
                activateType: (s, d) => {
                    return new type(s, d);
                },
                modelActivator: new ModelActivator()
            });
        }
        else
            console.warn('Attempt to duplicate entity already registered: ' + entityName);
    }
    createDeveloperModels() {
        this._entitiesInfo.forEach(ei => {
            let modelName = 'DEV_' + ei.name;
            let model = ei.modelActivator.activate(this._mongooseConnection, modelName, ei.schema);
            ei.models.push({ systemOwner: 'DEVELOPER', model });
        });
    }
    createSystemOwnerModels(systemOwner) {
        this._entitiesInfo.forEach(ei => {
            let modelName = systemOwner + '_' + ei.name;
            let model = ei.modelActivator.activate(this._mongooseConnection, modelName, ei.schema);
            ei.models.push({ systemOwner, model });
        });
    }
    enableDevMode() {
        this._devMode = true;
    }
    disableDevMode() {
        this._devMode = false;
    }
    throwException(message) {
        if (this._devMode)
            console.error('DEV-MODE: ' + message);
        else
            throw new Error(message);
    }
    throwInfo(message, warnDevMode) {
        warnDevMode = warnDevMode != null ? warnDevMode : true;
        if (warnDevMode && this._devMode)
            console.warn('DEV-MODE: ' + message);
        else
            console.info(message);
    }
    createError(error, message) {
        if (this._devMode) {
            let m = 'DevMode: Error in EMSession => ' + message;
            console.warn(m);
            return new EMSessionError(error, m);
        }
        else
            return new EMSessionError(null, 'INTERNAL SERVER ERROR');
    }
    //#endregion
    //#region Accessors
    get entitiesInfo() { return this._entitiesInfo; }
    get isDevMode() { return this._devMode; }
    get periodAmqpRetry() { return this._periodAmqpRetry; }
    set periodAmqpRetry(value) { this._periodAmqpRetry = value; }
    get limitAmqpRetry() { return this._limitAmqpRetry; }
    set limitAmqpRetry(value) { this._limitAmqpRetry = value; }
    get mongooseConnection() { return this._mongooseConnection; }
    get brokerConnection() { return this._brokerConnection; }
    get brokerChannel() { return this._brokerChannel; }
    get amqpExchangesDescription() { return this._amqpExchangesDescription; }
    set amqpExchangesDescription(value) { this._amqpExchangesDescription = value; }
    get amqpQueueBindsDescription() { return this._amqpQueueBindsDescription; }
    set amqpQueueBindsDescription(value) { this._amqpQueueBindsDescription = value; }
    get developerUserData() {
        if (this.isDevMode) {
            return {
                name: 'LOCAL DEVELOPER',
                userName: 'DEVELOPER',
                systemOwner: 'DEVELOPER',
                idUser: null
            };
        }
        else {
            this.throwException('It is not possible to use the Developer User Data without activate DevMode');
            return null;
        }
    }
}
exports.EMServiceSession = EMServiceSession;
class ModelActivator {
    constructor() { }
    activate(mongooseConnection, name, schema) {
        return mongooseConnection.model(name, schema);
    }
}
class EMSessionError {
    //#endregion
    //#region Methods
    constructor(error, message) {
        this._error = error;
        this._message = message;
        this._code = 500;
    }
    setAsHandledError(code, message) {
        this._code = code;
        this._message = message;
        this._isHandled = true;
    }
    //#endregion
    //#region Accessors
    get error() { return this._error; }
    get message() { return this._message; }
    get code() { return this._code; }
    get isHandled() { return this._isHandled; }
}
exports.EMSessionError = EMSessionError;
//# sourceMappingURL=emServiceSession.js.map