"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//Core Dependencies
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const redis = require("redis");
//Core Framework
const hcWrapper_1 = require("../../hc-core/hcWrapper/hcWrapper");
const emRouterManager_1 = require("../emRouterManager/emRouterManager");
const emServiceSession_1 = require("../emServiceSession/emServiceSession");
const TokenValidationRequestRPC_1 = require("../../amqp-events/amqp-base-events/TokenValidationRequestRPC");
const TokenValidationResponseRPC_1 = require("../../amqp-events/amqp-base-events/TokenValidationResponseRPC");
class EntifixApplication {
    //#endregion
    //#region methods
    //The constructor defines the main flow to create an Entifix Application
    constructor(port) {
        //Create express instance app that is going to be used in the Http Server
        this.createExpressApp(port);
        //Create and connect the entifix session.
        //This function is async and it is possbile to override "onSessionCreated" method to modify the behavior when the session will be ready.
        // By default "onSessionCreated" do:
        // 1 => invoke "registerEntities" and "exposeEntities" methods. 
        // 2 => If the AMQP Service is enabled, the service will connect to broker depending of configurations. Main Service listen for modules atached, and no main service atach itself as a module.
        this.createServiceSession();
        //Sync functions for express middleware
        //Authentication, Cors, Healthcheck...
        this.createMiddlewareFunctions();
    }
    registerEventsAndDelegates() { }
    ;
    createExpressApp(port) {
        this._expressApp = express();
        this._expressApp.set('port', port);
    }
    createServiceSession() {
        this._serviceSession = new emServiceSession_1.EMServiceSession(this.serviceConfiguration.serviceName, this.serviceConfiguration.mongoService, this.serviceConfiguration.amqpService);
        this.configSessionAMQPConneciton();
        if (this.serviceConfiguration.devMode)
            this._serviceSession.enableDevMode();
        this._serviceSession.connect().then(() => this.onServiceSessionCreated());
    }
    createMiddlewareFunctions() {
        //JSON parser
        this._expressApp.use(bodyParser.json());
        //Enable cors if is required
        if (this.serviceConfiguration.cors && this.serviceConfiguration.cors.enable) {
            let defaultValues = this.serviceConfiguration.cors.options || {
                allowedHeaders: ["Origin", "Content-Type", "Accept", "Authorization"],
                credentials: true,
                methods: "GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE",
                preflightContinue: false
            };
            this._expressApp.use(cors(defaultValues));
        }
        //Health check
        this._expressApp.get('/', (request, response) => {
            response.json({
                message: this.serviceConfiguration.serviceName + " is working correctly"
            });
        });
        //Error handler
        this._expressApp.use((error, request, response, next) => {
            let data;
            if (this.serviceConfiguration.devMode) {
                data = { serviceStatus: 'Developer mode is enabled.', helper: "The error was not ocurred without a Session context. The details were attached" };
                if (error)
                    data.errorDetails = {
                        type: typeof error,
                        asString: error.toString != null ? error.toString() : null,
                        serialized: JSON.stringify(error),
                        message: error.message,
                        stack: error.stack
                    };
            }
            response.status(500).send(hcWrapper_1.Wrapper.wrapError('INTERNAL UNHANDLED EXCEPTION', data).serializeSimpleObject());
        });
        //Protect routes
        let protectRoutes = this.serviceConfiguration.protectRoutes != null ? this.serviceConfiguration.protectRoutes.enable : true;
        let devMode = this.serviceConfiguration.devMode != null ? this.serviceConfiguration.devMode : false;
        if (!protectRoutes && devMode)
            this._serviceSession.throwInfo('Routes unprotected');
        else
            this.protectRoutes();
    }
    protectRoutes() {
        //Default values
        let pathProtected = this.serviceConfiguration.protectRoutes && this.serviceConfiguration.protectRoutes.path ? this.serviceConfiguration.protectRoutes.path : 'api';
        let header = this.serviceConfiguration.protectRoutes && this.serviceConfiguration.protectRoutes.header ? this.serviceConfiguration.protectRoutes.header : 'Authorization';
        //Register Function on express middleware
        this._expressApp.use('/' + pathProtected, (request, response, next) => {
            let deniedAccess = (message, errorCode, error) => response.status(errorCode || 401).send(hcWrapper_1.Wrapper.wrapError(message, error).serializeSimpleObject());
            //TOKEN VALIDATION
            var token = request.get(header);
            if (!token) {
                deniedAccess('Authorization required');
                return;
            }
            this.validateToken(token, request).then(result => {
                if (!result.error) {
                    if (result.success) {
                        request.privateUserData = result.privateUserData;
                        next();
                    }
                    else if (result)
                        deniedAccess(result.message);
                }
                else
                    deniedAccess('Remote error on token validation', 500, this.serviceConfiguration.devMode ? result.error : null);
            }).catch(error => deniedAccess('Error on token validation', 500, this.serviceConfiguration.devMode ? error : null));
        });
    }
    onServiceSessionCreated() {
        this.registerEntities();
        if (this.serviceConfiguration.devMode)
            this._serviceSession.createDeveloperModels();
        this._routerManager = new emRouterManager_1.EMRouterManager(this._serviceSession, this._expressApp);
        this.exposeEntities();
        if (this.serviceConfiguration.amqpService && this.useDefaultAMQPInteraction) {
            this._eventManager = this.serviceSession.createAndBindEventManager();
            this.createRPCAuthorizationDynamic();
            this.registerEventsAndDelegates();
        }
        if (this.serviceConfiguration.authCacheService) {
            this._authCacheClient = redis.createClient({ host: this.serviceConfiguration.authCacheService, port: this.serviceConfiguration.authCacheServicePort });
            this._authCacheClient.on("error ", err => this._serviceSession.throwException(err));
        }
    }
    configSessionAMQPConneciton() {
        if (this.useDefaultAMQPInteraction) {
            this._serviceSession.amqpExchangesDescription = [
                { name: 'main_events', type: 'topic', durable: false }
            ];
            if (this.isMainService)
                this._serviceSession.amqpQueueBindsDescription = [{ name: 'modules_to_atach', exchangeName: 'main_events', routingKey: 'auth.module_atach', exclusive: true }];
        }
    }
    saveModuleAtached(message) {
        // var moduleAtached : { serviceModuleName: string, resources: Array<{ entityName : string, resourceName : string, basePath : string }> } = JSON.parse(message.content.toString());  
        // this._serviceSession.getModel()
        // this._session.getModel<IEntifixApplicationModuleModel>("EntifixApplicationModule").find( { name: moduleAtached.serviceModuleName }, 
        //     ( err, res ) => {
        //         if (!err && res)
        //         {
        //             if (res.length == 0)
        //             {
        //                 let newModule = new EntifixApplicationModule(this._session);
        //                 newModule.name = moduleAtached.serviceModuleName;
        //                 newModule.resources = moduleAtached.resources;
        //                 newModule.save().then( () => this._serviceSession.brokerChannel.ack(message) );
        //             }
        //             else
        //             {
        //                 let module = new EntifixApplicationModule(this._session, res[0]);
        //                 module.name = moduleAtached.serviceModuleName;
        //                 module.resources = moduleAtached.resources;
        //                 module.save().then( () => this._serviceSession.brokerChannel.ack(message) );
        //             }
        //         }
        //     }
        // );
    }
    atachModule(exchangeName, routingKey) {
        let message = {
            serviceModuleName: this.serviceConfiguration.serviceName,
            resources: this._routerManager.getExpositionDetails()
        };
        this._serviceSession.mainChannel.publish(exchangeName, routingKey, new Buffer(JSON.stringify(message)));
    }
    createRPCAuthorizationDynamic() {
        if (this.isMainService)
            this._eventManager.registerDelegate(TokenValidationResponseRPC_1.TokenValidationResponseRPC).processTokenAction = tvr => this.processTokenValidationRequest(tvr);
        else
            this._eventManager.registerEvent(TokenValidationRequestRPC_1.TokenValidationRequestRPC);
    }
    processTokenValidationRequest(tokenValidationRequest) {
        this.serviceSession.throwException('No setted process for token validation request');
        return null;
    }
    requestTokenValidation(token, request) {
        return new Promise((resolve, reject) => {
            let tokenValidationData = {
                token,
                requestPath: request.path,
                onResponse: tokenValidationResponse => resolve(tokenValidationResponse)
            };
            this._eventManager.publish('TokenValidationRequestRPC', tokenValidationData);
        });
    }
    requestTokenValidationWithCache(token, request) {
        return new Promise((resolve, reject) => {
            this.getTokenValidationCache(token, request).then(result => {
                if (!result.exists) {
                    this.requestTokenValidation(token, request).then(res => {
                        this.setTokenValidationCache(token, request, res).then(() => resolve(res), error => reject(error));
                    }, error => reject(error));
                }
                else
                    resolve(result.cacheResult);
            }, error => reject(error));
        });
    }
    getTokenValidationCache(token, request) {
        return new Promise((resolve, reject) => {
            let keyCache = this.createKeyCache(token, request);
            this._authCacheClient.get(keyCache, (error, value) => {
                if (!error) {
                    if (value) {
                        let cacheResult = JSON.parse(value);
                        resolve({ exists: true, cacheResult });
                    }
                    else
                        resolve({ exists: false });
                }
                else
                    reject(error);
            });
        });
    }
    setTokenValidationCache(token, request, result) {
        return new Promise((resolve, reject) => {
            let keyCache = this.createKeyCache(token, request);
            let resultString = JSON.stringify(result);
            this._authCacheClient.set(keyCache, resultString, 'EX', this.cacheExpiration, error => {
                if (!error)
                    resolve();
                else
                    reject(error);
            });
        });
    }
    createKeyCache(token, request) {
        // let keyCacheToProcess = token + '-' + request.method + '-' + request.originalUrl;
        // return crypto.createHash('sha256').update(keyCacheToProcess).digest().toString();
        return token + '-' + request.method + '-' + request.originalUrl;
    }
    //#endregion
    //#region Accessors
    get isMainService() {
        return this.serviceConfiguration.isMainService != null ? this.serviceConfiguration.isMainService : false;
    }
    get expressApp() { return this._expressApp; }
    get routerManager() { return this._routerManager; }
    get cacheExpiration() {
        return this.serviceConfiguration.authCacheDuration || (60 * 5);
    }
    get serviceSession() { return this._serviceSession; }
    get useDefaultAMQPInteraction() {
        return (this.serviceConfiguration.amqpService != null) && (this.serviceConfiguration.amqpDefaultInteraction != false);
    }
}
exports.EntifixApplication = EntifixApplication;
class TokenValidator {
    constructor(idRequest, serviceName, channel, token, request, authQueueName, assertedQueue) {
        this.idRequest = idRequest;
        this.serviceName = serviceName;
        this.channel = channel;
        this.token = token;
        this.request = request;
        this.authQueueName = authQueueName;
        this.assertedQueue = assertedQueue;
        this.promise = new Promise((resolve, reject) => {
            let tokenRequest = {
                token: this.token,
                path: this.request.path
            };
            this.channel.sendToQueue(this.authQueueName, new Buffer(JSON.stringify(tokenRequest)), { correlationId: this.idRequest, replyTo: this.assertedQueue.queue });
            let consumer = (idReq, resolvePromise) => {
                function onConsume(message) {
                    if (message.properties.correlationId == this.idRequest) {
                        let validation = JSON.parse(message.content.toString());
                        resolvePromise(validation);
                    }
                }
            };
            let newConsumerInstance = new Consumer(this.idRequest, resolve);
            this.channel.consume(this.assertedQueue.queue, newConsumerInstance.onConsume, { noAck: true });
        });
    }
}
function Consumer(idReq, resolvePromise) {
    this.onConsume = function (message) {
        let a = 3;
        let b = this;
        if (message.properties.correlationId == this.idRequest) {
            let validation = JSON.parse(message.content.toString());
            resolvePromise(validation);
        }
    };
}
//# sourceMappingURL=entifix-application.js.map