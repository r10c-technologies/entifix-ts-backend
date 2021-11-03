//CORE DEPENDENCIES
import { EventEmitter } from 'events';
import mongoose = require('mongoose');
import amqp = require('amqplib/callback_api');
import redis = require('redis');

//CORE FRAMEWORK
import { AMQPConnectionDynamic, QueueBindDescription } from '../../amqp-events/amqp-connection/amqpConnectionDynamic';
import { EMEntity, EntityDocument } from '../emEntity/emEntity';
import {
  IMetaDataInfo,
  EntityInfo,
  PersistenceType,
  AccessorInfo,
  ExpositionType,
  MemberBindingType,
  MethodInfo,
} from '../../hc-core/hcMetaData/hcMetaData';
import { EMSession } from '../emSession/emSession';
import { PrivateUserData } from '../../hc-core/hcUtilities/interactionDataModels';
import { AMQPEventManager, ExchangeDescription } from '../../amqp-events/amqp-event-manager/AMQPEventManager';
import { MongoServiceConfig } from '../base-entities/entifix-application';

class EMServiceSession {
  //#region Properties

  //Connection instances
  private _serviceName: string;
  private _mongooseInstance: any;
  private _mongooseConnection: mongoose.Connection;
  private _brokerConnection: amqp.Connection;
  private _brokerChannels: Array<{ name: string; instance: amqp.Channel }>;
  private _authCacheClient: redis.RedisClient;
  private _isBrokerConnected: boolean;
  private _isCacheConnected: boolean;

  //Configuraion properties
  private _mongoServiceConfig: string | MongoServiceConfig;
  private _urlAmqpConnection: string;
  private _periodAmqpRetry;
  private _limitAmqpRetry;
  private _amqpExchangesDescription: Array<ExchangeDescription>;
  private _amqpQueueBindsDescription: Array<QueueBindDescription>;
  private _devMode: boolean;
  private _allowFixedSystemOwners: boolean;
  private _cacheService: { host: string; port: number };
  private _reportsService: { host: string; port: string; path: string; methodToRequest: string };

  //Main artifact instances
  private _amqpEventManager: AMQPEventManager;
  private _utilInstances: Map<string, any>;

  private _entitiesInfo: Array<{
    name: string;
    info: EntityInfo;
    schema: any;
    models: Array<{ systemOwner: string; model: any }>;
    activateType: (s: EMSession, d: EntityDocument) => any;
    modelActivator: ModelActivator;
  }>;

  private _unconstrainedModels: Array<{
    name: string;
    modelActivator: ModelActivator;
    schema: mongoose.Schema;
    models: Array<{ systemOwner: string; model: any }>;
  }>;

  //Utilities
  private _userDevDataNotification = false;

  //#endregion

  //#region Methods

  private constructor(
    serviceName: string,
    mongoService: string | MongoServiceConfig,
    options?: {
      amqpService?: string;
      cacheService?: { host: string; port: number };
      reportsService?: { host: string; port: string; path: string; methodToRequest: string };
    }
  ) {
    this._serviceName = serviceName;
    this._entitiesInfo = [];
    this._brokerChannels = new Array<{ name: string; instance: amqp.Channel }>();
    this._allowFixedSystemOwners = false;

    //Mongo Configuration
    this._mongoServiceConfig = mongoService;

    //AMQP Configuration
    if (options && options.amqpService) {
      this._urlAmqpConnection = 'amqp://' + options.amqpService;

      //defaluts
      this._limitAmqpRetry = 10;
      this._periodAmqpRetry = 2000;
    }

    //RedisCache Configuration
    if (options && options.cacheService) {
      this._cacheService = options.cacheService;
    }

    //Reports Service
    if (options && options.reportsService) {
      this._reportsService = options.reportsService;
    }
  }

  connect(): Promise<void> {
    let asyncConn = new Array<Promise<void>>();

    asyncConn.push(
      new Promise<void>((resolve, reject) => {
        if (typeof this._mongoServiceConfig == 'string') {
          let url = 'mongodb://' + this._mongoServiceConfig;
          this._mongooseConnection = mongoose.createConnection(url);
        } else {
          let config = this._mongoServiceConfig as MongoServiceConfig;
          let base = config.base || 'mongodb://';
          let url = base + config.url;
          this._mongooseConnection = mongoose.createConnection(url, { user: config.user, pass: config.password });
        }

        //Pending to validate async result
        resolve();
      })
    );

    asyncConn.push(
      new Promise<void>((resolve, reject) => {
        if (this._urlAmqpConnection)
          this.atachToBroker()
            .then(() => {
              this._isBrokerConnected = true;
              this._brokerConnection.on('close', () => (this._isBrokerConnected = false));
              resolve();
            })
            .catch(error => reject(error));
        else resolve();
      })
    );

    asyncConn.push(
      new Promise<void>((resolve, reject) => {
        if (this._cacheService && this._cacheService.host && this._cacheService.port) {
          this._authCacheClient = redis.createClient({ host: this._cacheService.host, port: this._cacheService.port });
          this._isCacheConnected = this._authCacheClient != null;

          if (this._isCacheConnected) {
            this._authCacheClient.on('end', err => (this._isCacheConnected = false));
            this._authCacheClient.on('error', err => (this._isCacheConnected = false));
          }

          //Pending to validate async result
          resolve();
        } else resolve();
      })
    );

    return Promise.all(asyncConn)
      .then(() => {
        EMServiceSession.emit('serviceSessionConnected');
      })
      .catch(error => this.throwException(error));
  }

  private atachToBroker(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      AMQPConnectionDynamic.connect(this._urlAmqpConnection, { period: this._periodAmqpRetry, limit: this._limitAmqpRetry })
        .then(connection => {
          this._brokerConnection = connection;
          resolve();
        })
        .catch(err => reject(err));
    });
  }

  createAndBindEventManager(): AMQPEventManager {
    this._amqpEventManager = new AMQPEventManager(this);
    return this._amqpEventManager;
  }

  publishAMQPMessage(session: EMSession, eventName: string, data: any): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this._amqpEventManager) this._amqpEventManager.publish(eventName, data, { session }).then(resolve).catch(reject);
      else reject('No AMQP Event manager binded');
    });
  }

  publishAMQPAction(session: EMSession, methodInfo: MethodInfo, entityId: string, data: any): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this._amqpEventManager)
        this._amqpEventManager
          .publish(methodInfo.eventName, data, {
            session,
            entityName: methodInfo.className,
            actionName: methodInfo.name,
            entityId,
          })
          .then(resolve)
          .catch(reject);
      else reject('No AMQP Event manager binded');
    });
  }

  getInfo(entityName: string): EntityInfo {
    let infoRegister = this._entitiesInfo.find(e => e.name == entityName);

    if (!infoRegister) this.throwException('Entity not registered: ' + entityName);

    return infoRegister.info;
  }

  getModel<TDocument extends EntityDocument>(entityName: string, systemOwner: string): mongoose.Model<TDocument> {
    let infoRegister = this._entitiesInfo.find(e => e.name == entityName);
    if (!infoRegister) this.throwException('Entity not registered: ' + entityName);

    let model: mongoose.Model<TDocument>;

    if (infoRegister.info.fixedSystemOwner) {
      systemOwner = infoRegister.info.fixedSystemOwner;
      let modelRegister = infoRegister.models.find(m => m.systemOwner == systemOwner);
      if (!modelRegister) {
        model = this.createEntityModel<TDocument>(
          systemOwner,
          infoRegister.info,
          infoRegister.modelActivator,
          infoRegister.schema
        );
        infoRegister.models.push({ systemOwner: systemOwner, model });
      } else model = modelRegister.model;
    } else {
      let modelRegister = infoRegister.models.find(m => m.systemOwner == systemOwner);
      if (!modelRegister) this.throwException(`Model ${entityName} not registered for System Owner ${systemOwner}`);
      model = modelRegister.model;
    }

    return model;
  }

  registerEntity<TDocument extends mongoose.Document, TEntity extends EMEntity>(
    type: { new (session: EMSession, document: EntityDocument): TEntity },
    entityInfo: EntityInfo
  ): void {
    var structureSchema = entityInfo.getCompleteSchema();
    var entityName = entityInfo.name;

    if (this.entitiesInfo.filter(e => e.name == entityName).length == 0) {
      var schema = new mongoose.Schema(structureSchema);

      this._entitiesInfo.push({
        name: entityName,
        info: entityInfo,
        schema: schema,
        models: [],
        activateType: (s: EMSession, d: EntityDocument) => {
          return new type(s, d);
        },
        modelActivator: new ModelActivator(),
      });
    } else console.warn('Attempt to duplicate entity already registered: ' + entityName);
  }

  createDeveloperModels(): void {
    this._entitiesInfo.forEach(ei => {
      let devData = this.getDeveloperUserData({ skipNotification: true });
      let model = this.createEntityModel(devData.systemOwnerSelected, ei.info, ei.modelActivator, ei.schema);
      ei.models.push({ systemOwner: devData.systemOwnerSelected, model });
    });
  }

  verifySystemOwnerModels(systemOwner: string): void {
    this._entitiesInfo
      .filter(ei => ei.models.find(m => m.systemOwner == systemOwner) == null && ei.info.fixedSystemOwner == null)
      .forEach(ei => {
        let model = this.createEntityModel(systemOwner, ei.info, ei.modelActivator, ei.schema);
        ei.models.push({ systemOwner, model });
      });
  }

  private createEntityModel<T extends EntityDocument>(
    systemOwner: string,
    entityInfo: EntityInfo,
    modelActivator: ModelActivator,
    schema: any
  ) {
    let modelName: string;
    let discriminator: string;

    if (entityInfo.inheritedMapping) {
      discriminator = `${this.serviceName}.${entityInfo.packageName}.${entityInfo.name}`;

      let base = entityInfo.base;
      while (base && !modelName) {
        if (!base.inheritedMapping) modelName = base.name;
        base = base.base;
      }
    } else modelName = entityInfo.name;

    if (!modelName) this.throwException(`It was not possible to map the class [${entityInfo.name}] to a persistent model`);

    return modelActivator.activate<T>(this._mongooseConnection, systemOwner, modelName, schema, { discriminator });
  }

  addUnconstrainedModelDefinition<TModel extends mongoose.Document>(name: string, schema: mongoose.Schema) {
    if (!this._unconstrainedModels) this._unconstrainedModels = [];

    if (!this._unconstrainedModels.find(um => um.name == name)) {
      let modelActivator = new ModelActivator();
      this._unconstrainedModels.push({ name, modelActivator, models: null, schema });
    }
  }

  getUnconstrainedModel<TModel extends mongoose.Document>(systemOwner: string, name: string): mongoose.Model<TModel> {
    if (!this._unconstrainedModels) this.throwException('There are no unconstrained model definitions');

    let definition = this._unconstrainedModels.find(um => um.name == name);
    if (!definition) this.throwException('There are no unconstrained model definition for : [' + name + ']');

    if (!definition.models) definition.models = [];

    let modelForSystemOwner = definition.models.find(e => e.systemOwner == systemOwner);
    if (!modelForSystemOwner) {
      modelForSystemOwner = {
        systemOwner,
        model: definition.modelActivator.activate(this._mongooseConnection, systemOwner, name, definition.schema),
      };
      definition.models.push(modelForSystemOwner);
    }

    return modelForSystemOwner.model;
  }

  enableDevMode(): void {
    this._devMode = true;
  }

  disableDevMode(): void {
    this._devMode = false;
  }

  throwException(message: string): void {
    if (this._devMode) {
      console.error('[X EXCEPTION] DEV-MODE: ' + message);
    } else {
      throw new Error(message);
    }
  }

  logInDevMode(message: string);
  logInDevMode(message: string, type: string);
  logInDevMode(message: string, type?: string) {
    if (this._devMode == true) {
      let msg = 'DEV-MODE: ' + message;

      switch (type) {
        case 'error':
          console.error(msg);
          break;
        case 'warn':
          console.warn(msg);
          break;
        case 'info':
          console.info(msg);
          break;
        default:
          console.log(msg);
      }
    }
  }

  throwInfo(message: string): void;
  throwInfo(message: string, warnDevMode: boolean): void;
  throwInfo(message: string, warnDevMode?: boolean): void {
    warnDevMode = warnDevMode != null ? warnDevMode : true;

    if (warnDevMode && this._devMode) console.warn('DEV-MODE: ' + message);
    else console.info(message);
  }

  createError(error: any, message: string) {
    if (this._devMode) {
      let m = 'DevMode => Error in EMSession: ' + message + '.';
      if (error) m += ' => ' + error.toString();
      console.warn(m);
      return new EMSessionError(error, m);
    } else return new EMSessionError(null, 'INTERNAL SERVER ERROR');
  }

  checkAMQPConnection(): void {
    if (!this._urlAmqpConnection || !this._brokerConnection) this.throwException('No AMQP service enabled');
  }

  enableFixedSystemOwners(): void {
    this._allowFixedSystemOwners = true;
  }

  getDeveloperUserData(): PrivateUserData;
  getDeveloperUserData(options: { skipNotification?: boolean }): PrivateUserData;
  getDeveloperUserData(options?: { skipNotification?: boolean }): PrivateUserData {
    if (this.isDevMode) {
      options = options || {};
      let skipNotification = options.skipNotification != null ? options.skipNotification : false;

      if (!this._userDevDataNotification && !skipNotification) {
        this.logInDevMode('Using private user data for developer in the created sessions');
        this._userDevDataNotification = true;
      }

      return {
        name: 'LOCAL DEVELOPER',
        userName: 'DEVELOPER',
        systemOwnerSelected: 'DEVELOPER',
        idUser: null,
        sessionKey: null,
        password: null,
        token: null,
        refreshToken: null,
      };
    } else {
      this.throwException('It is not possible to use the Developer User Data without activate DevMode');
      return null;
    }
  }

  setUtilInstance<T>(key: string, utilInstance: T): void {
    if (!this._utilInstances) {
      this._utilInstances = new Map<string, any>();
    }

    const oldValue = this._utilInstances.has(key) ? this._utilInstances.get(key) : undefined;
    this._utilInstances.set(key, utilInstance);
    EMServiceSession.emit(`set.${key}`, { oldValue, newValue: utilInstance });
  }

  getUtilInstance<T>(key: string): T | undefined {
    return this._utilInstances && this._utilInstances.has(key) ? this._utilInstances.get(key) : undefined;
  }

  //#endregion

  //#region Accessors

  get amqpEventManager() {
    return this._amqpEventManager;
  }

  get serviceName() {
    return this._serviceName;
  }

  get entitiesInfo() {
    return this._entitiesInfo;
  }

  get isDevMode() {
    return this._devMode;
  }

  get periodAmqpRetry() {
    return this._periodAmqpRetry;
  }
  set periodAmqpRetry(value) {
    this._periodAmqpRetry = value;
  }

  get limitAmqpRetry() {
    return this._limitAmqpRetry;
  }
  set limitAmqpRetry(value) {
    this._limitAmqpRetry = value;
  }

  get mongooseConnection() {
    return this._mongooseConnection;
  }

  get brokerConnection() {
    return this._brokerConnection;
  }

  get brokerChannels() {
    return this._brokerChannels;
  }

  get amqpExchangesDescription() {
    return this._amqpExchangesDescription;
  }
  set amqpExchangesDescription(value) {
    this._amqpExchangesDescription = value;
  }

  get amqpQueueBindsDescription() {
    return this._amqpQueueBindsDescription;
  }
  set amqpQueueBindsDescription(value) {
    this._amqpQueueBindsDescription = value;
  }

  get mainChannel() {
    let mc = this._brokerChannels.find(c => c.name == 'mainChannel');

    if (!mc) this.throwException('Main broker channel not found');

    return mc.instance;
  }

  get allowFixedSystemOwners() {
    return this._allowFixedSystemOwners;
  }

  get authCacheClient(): redis.RedisClient {
    return this._authCacheClient;
  }

  get reportsService(): { host: string; port: string; path: string; methodToRequest: string } {
    return this._reportsService;
  }

  get isBrokerConnected(): boolean {
    return this._isBrokerConnected;
  }

  get isCacheConnected(): boolean {
    return this._isCacheConnected;
  }

  get isDbConnected(): boolean {
    return this._mongooseConnection.readyState == 1;
  }

  //#endregion

  //#region  Static

  private static _instance: EMServiceSession;
  private static _eventEmitter: EventEmitter = new EventEmitter();

  public static get instance() {
    return this._instance;
  }

  static initialize(serviceName: string, mongoService: string | MongoServiceConfig);
  static initialize(
    serviceName: string,
    mongoService: string | MongoServiceConfig,
    options: {
      amqpService?: string;
      cacheService?: { host: string; port: number };
      reportsService?: { host: string; port: string; path: string; methodToRequest: string };
    }
  );
  static initialize(
    serviceName: string,
    mongoService: string | MongoServiceConfig,
    options?: {
      amqpService?: string;
      cacheService?: { host: string; port: number };
      reportsService?: { host: string; port: string; path: string; methodToRequest: string };
    }
  ) {
    if (!this._instance) this._instance = new EMServiceSession(serviceName, mongoService, options);
    else this._instance.throwException('Service session already created');
  }

  static get on() {
    return this._eventEmitter.on;
  }

  static get emit() {
    return this._eventEmitter.emit;
  }

  //#endregion
}

class ModelActivator {
  constructor() {}

  activate<T extends EntityDocument>(
    mongooseConnection: mongoose.Connection,
    systemOwner: string,
    name: string,
    schema: mongoose.Schema,
    options?: { discriminator?: string }
  ): mongoose.Model<T> {
    let completeModelName = systemOwner + '_' + name;
    if (options && options.discriminator)
      return mongooseConnection.model(completeModelName).discriminator<T>(systemOwner + '.' + options.discriminator, schema);
    else return mongooseConnection.model<T>(completeModelName, schema as any); // Temp forced type
  }
}

class EMSessionError {
  //#region Properties

  private _code: number;
  private _error: any;
  private _message: string;
  private _isHandled: boolean;
  private _helper: string;
  private _includeDetails: boolean;
  private _cause: string;

  //#endregion

  //#region Methods

  constructor(error: any, message: string) {
    this._error = error;
    this._message = message;

    this._code = 500;
    this._includeDetails = true;
  }

  setAsHandled(code: number, options?: { helper?: string; includeDetails?: boolean; cause?: string }): void {
    this._isHandled = true;
    this._code = code;

    if (options) {
      this._helper = options.helper;
      this._cause = options.cause;

      if (options.includeDetails != null) this._includeDetails = options.includeDetails;
    }
  }

  //#endregion

  //#region Accessors

  get error() {
    return this._error;
  }

  get message() {
    return this._message;
  }

  get code() {
    return this._code;
  }

  get isHandled() {
    return this._isHandled;
  }

  get helper() {
    return this._helper;
  }

  get cause() {
    return this._cause;
  }

  get includeDetails() {
    return this._includeDetails;
  }

  //#endregion
}

export { EMServiceSession, EMSessionError };
