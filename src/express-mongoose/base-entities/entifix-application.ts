//Core Dependencies
import express = require('express');
import fileUpload = require('express-fileupload');
import bodyParser = require('body-parser');
import amqp = require('amqplib/callback_api');
import { EventEmitter } from 'events';
import cors, { CorsOptions } from 'cors';

//Core Framework
import { Wrapper } from '../../hc-core/hcWrapper/hcWrapper';
import {
  TokenValidationRequest,
  TokenValidationResponse,
  PrivateUserData,
} from '../../hc-core/hcUtilities/interactionDataModels';
import { EMRouterManager } from '../emRouterManager/emRouterManager';
import { EMServiceSession } from '../emServiceSession/emServiceSession';
import { AMQPEventManager, ExchangeType } from '../../amqp-events/amqp-event-manager/AMQPEventManager';
import { TokenValidationRequestRPC } from '../../amqp-events/amqp-base-events/TokenValidationRequestRPC';
import { TokenValidationResponseRPC } from '../../amqp-events/amqp-base-events/TokenValidationResponseRPC';
import { IEntityKeyModel, EntityKey } from '../emEntityMultiKey/emEntityMultiKey';
import { EntifixLogger } from '../../app-utilities/logger/entifixLogger';
import { EntifixLoggerLevel } from '../../app-utilities/logger/entifixLoggerLevels';
import { EntifixLoggerFormat } from '../../app-utilities/logger/entifixLoggerFormat';

interface EntifixAppConfig {
  serviceName: string;
  mongoService: string | MongoServiceConfig;
  amqpService?: string;
  amqpDefaultInteraction?: boolean;
  isMainService?: boolean;
  cors?: { enable: boolean; options?: CorsOptions };
  devMode?: boolean;
  protectRoutes?: { enable: boolean; header?: string; path?: string };
  session?: { refreshPeriod?: number; expireLimit?: number; tokenSecret?: string };
  authCacheService?: { host: string; port: number };
  reportsService?: { host: string; port: string; path: string; methodToRequest: string };
  basePath?: string;
  useCacheForTokens?: boolean;
  logger?: { level?: EntifixLoggerLevel; format?: EntifixLoggerFormat };
  fileUpLoadConfiguration?: any; // To install correct types
}

interface MongoServiceConfig {
  user: string;
  password: string;
  url: string;
  base?: string;
}

type EntifixApplicationStatus = 'OnStart' | 'Started';

abstract class EntifixApplication {
  //#region Properties

  private _expressApp: express.Application;
  private _routerManager: EMRouterManager;
  private _eventManager: AMQPEventManager;
  private _status: EntifixApplicationStatus = 'OnStart';

  _eventEmitter: EventEmitter;

  //#endregion

  //#region methods

  //The constructor defines the main flow to create an Entifix Application
  constructor(port: number) {
    //Default internals
    let asyncTask = new Array<Promise<void>>();
    this._eventEmitter = new EventEmitter();

    //Configure Entifix Logger
    this.configureLogger();

    //Create express instance app that is going to be used in the Http Server
    this.createExpressApp(port);

    //Create and connect the entifix session.
    //This function is async and it is possbile to override "onSessionCreated" method to modify the behavior when the session will be ready.
    // By default "onSessionCreated" do:
    // 1 => invoke "registerEntities" and "exposeEntities" methods.
    // 2 => If the AMQP Service is enabled, the service will connect to broker depending of configurations. Main Service listen for modules atached, and no main service atach itself as a module.
    asyncTask.push(this.createServiceSession());

    //Sync functions for express middleware
    //Authentication, Cors, Healthcheck...
    asyncTask.push(this.createMiddlewareFunctions());

    Promise.all(asyncTask)
      .then(() => {
        this._status = 'Started';
        this.emit('application_started');
      })
      .catch(e => this.serviceSession.throwException(e));
  }

  //Members that has to be implemented for inherited classes
  protected abstract get serviceConfiguration(): EntifixAppConfig;
  protected abstract registerEntities(): void;
  protected abstract exposeEntities(): void;
  protected registerEventsAndDelegates(): void {}

  private createExpressApp(port: number): void {
    this._expressApp = express();
    this._expressApp.set('port', port);
  }

  private createServiceSession(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let rejectPromise = e => {
        reject(e);
      };

      EMServiceSession.initialize(this.serviceConfiguration.serviceName, this.serviceConfiguration.mongoService, {
        amqpService: this.serviceConfiguration.amqpService,
        cacheService: this.serviceConfiguration.authCacheService,
        reportsService: this.serviceConfiguration.reportsService,
      });

      this.configSessionAMQPConneciton();
      if (this.serviceConfiguration.devMode) this.serviceSession.enableDevMode();

      this.serviceSession
        .connect()
        .then(() => {
          let asyncTask = this.onServiceSessionCreated();
          if (asyncTask) asyncTask.then(resolve).catch(rejectPromise);
          else resolve();
        })
        .catch(rejectPromise);
    });
  }

  protected createMiddlewareFunctions(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      //JSON parser
      this._expressApp.use(bodyParser.json());

      //File uploader
      // =====================================================================================================================
      if (this.serviceConfiguration.fileUpLoadConfiguration)
        this._expressApp.use(fileUpload(this.serviceConfiguration.fileUpLoadConfiguration));

      // =====================================================================================================================

      // Trace logger
      // =====================================================================================================================

      this._expressApp.all('/*', (request, response, next) => {
        EntifixLogger.trace({
          message: `Incoming request to path: [${request.path}]`,
          origin: { file: 'entifix-application', class: 'EntifixApplication', method: 'createMiddlewareFunctions' },
          developer: 'herber230',
        });

        next();
      });

      // =====================================================================================================================

      //Enable cors if is required
      // =====================================================================================================================
      if (this.serviceConfiguration.cors && this.serviceConfiguration.cors.enable) {
        let defaultValues: CorsOptions = this.serviceConfiguration.cors.options || {
          allowedHeaders: [
            'Origin',
            'Content-Type',
            'Accept',
            'Authorization',
            'Charset',
            'X-Requested-Type',
            'X-Page-Size',
            'X-Table-Striped',
            'X-Page-Orientation',
            'enctype',
          ],
          credentials: true,
          methods: 'GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE',
          preflightContinue: false,
        };

        this._expressApp.use(cors(defaultValues));
      }
      // =====================================================================================================================

      // Health checks
      // =====================================================================================================================
      let getBaseStatus = (request: express.Request, response: express.Response) => {
        response.json({
          message: this.serviceConfiguration.serviceName + ' is working correctly',
        });
      };

      this._expressApp.get('/', getBaseStatus);
      if (this.serviceConfiguration.basePath) this._expressApp.get('/' + this.serviceConfiguration.basePath, getBaseStatus);

      this._expressApp.get('/health', (request, response, next) => {
        if (
          this.serviceSession.isDbConnected &&
          this.serviceSession.isBrokerConnected &&
          this.serviceSession.isCacheConnected
        )
          response.sendStatus(200);
        else response.sendStatus(500);
      });

      // =====================================================================================================================

      // Error handler
      // =====================================================================================================================
      this._expressApp.use(
        (error: any, request: express.Request, response: express.Response, next: express.NextFunction) => {
          let data: any;

          if (this.serviceConfiguration.devMode) {
            data = {
              serviceStatus: 'Developer mode is enabled.',
              helper: 'The error did not occur without a Session context. The details were attached',
            };
            if (error)
              data.errorDetails = {
                type: typeof error,
                asString: error.toString != null ? error.toString() : null,
                serialized: JSON.stringify(error),
                message: error.message,
                stack: error.stack,
              };
          }

          response.status(500).send(Wrapper.wrapError('INTERNAL UNHANDLED EXCEPTION', data).serializeSimpleObject());
        }
      );
      // =====================================================================================================================

      // Protect routes
      // =====================================================================================================================
      let protectRoutes =
        this.serviceConfiguration.protectRoutes != null ? this.serviceConfiguration.protectRoutes.enable : true;
      let devMode = this.serviceConfiguration.devMode != null ? this.serviceConfiguration.devMode : false;
      if (!protectRoutes && devMode) this.serviceSession.throwInfo('Routes unprotected');
      else this.protectRoutes();
      // =====================================================================================================================

      resolve();
    });
  }

  private protectRoutes(): void {
    //Default values
    let header =
      this.serviceConfiguration.protectRoutes && this.serviceConfiguration.protectRoutes.header
        ? this.serviceConfiguration.protectRoutes.header
        : 'Authorization';

    let pathProtected = '/';

    if (this.serviceConfiguration.basePath) pathProtected += this.serviceConfiguration.basePath + '/';

    pathProtected +=
      this.serviceConfiguration.protectRoutes && this.serviceConfiguration.protectRoutes.path
        ? this.serviceConfiguration.protectRoutes.path
        : 'api';

    //Register Function on express middleware
    this._expressApp.use(pathProtected, (request, response, next) => {
      let deniedAccess = (message, errorCode?, error?) =>
        response.status(errorCode || 401).send(Wrapper.wrapError(message, error).serializeSimpleObject());

      //TOKEN VALIDATION
      let proceedWithTokenValidation = () => {
        let token = request.get(header);
        if (token) {
          this.localTrace('Performing token validation', 'herber230', 'protectRoutes->proceedWithTokenValidation');
          this.validateToken(token, request)
            .then(result => {
              this.localTrace(
                `Incoming token validation result: [${JSON.stringify(result)}]`,
                'herber230',
                'protectRoutes->proceedWithTokenValidation'
              );
              if (!result.error) {
                if (result.success) {
                  (request as any).privateUserData = result.privateUserData;
                  next();
                } else if (result) deniedAccess(result.message);
              } else {
                let errorCode = result.errorCode || 500;
                let errorMessage = result.message || 'Remote error on token validation';
                deniedAccess(errorMessage, errorCode, this.serviceConfiguration.devMode ? result.error : null);
              }
            })
            .catch(error => {
              this.localError(
                `Local error on token validation: [${error}]`,
                'herber230',
                'protectRoutes->proceedWithTokenValidation'
              );
              deniedAccess('Error on token validation', 500, this.serviceConfiguration.devMode ? error : null);
            });
        } else deniedAccess('Authorization required');
      };

      let whitelistResult = this.checkForWhitelistRoute(request);
      if (whitelistResult instanceof Promise)
        whitelistResult
          .then(asyncResult => (asyncResult ? next() : proceedWithTokenValidation()))
          .catch(error => {
            this.localError(
              `Local error on token validation including whitelistResult: [${error}]`,
              'herber230',
              'protectRoutes->proceedWithTokenValidation'
            );
            deniedAccess('Error on token validation', 500, this.serviceConfiguration.devMode ? error : null);
          });
      else if (whitelistResult) next();
      else proceedWithTokenValidation();
    });
  }

  protected checkForWhitelistRoute(request: express.Request): boolean | Promise<boolean> {
    return false;
  }

  protected onServiceSessionCreated(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.registerDefaultEntities();
      this.registerEntities();

      if (this.serviceConfiguration.devMode) this.serviceSession.createDeveloperModels();

      this._routerManager = new EMRouterManager(this.serviceSession, this._expressApp, {
        basePath: this.serviceConfiguration.basePath,
      });
      this.exposeEntities();
      EMServiceSession.emit('routerManagerStarted', this.routerManager);

      if (this.serviceConfiguration.amqpService && this.useDefaultAMQPInteraction) {
        this._eventManager = this.serviceSession.createAndBindEventManager();
        this.createRPCAuthorizationDynamic();
        this.registerEventsAndDelegates();
        EMServiceSession.emit('eventManagerStarted', this.eventManager);
      }

      resolve();
    });
  }

  protected registerDefaultEntities(): void {
    this.serviceSession.registerEntity<IEntityKeyModel, EntityKey>(EntityKey, EntityKey.getInfo());
  }

  protected configSessionAMQPConneciton(): void {
    if (this.useDefaultAMQPInteraction) {
      this.serviceSession.amqpExchangesDescription = [
        { name: 'main_events', type: ExchangeType.topic, options: { durable: false } },
      ];

      if (this.isMainService)
        this.serviceSession.amqpQueueBindsDescription = [
          { name: 'modules_to_atach', exchangeName: 'main_events', routingKey: 'auth.module_atach', exclusive: true },
        ];
    }
  }

  protected atachModule(exchangeName: string, routingKey: string): void {
    let message = {
      serviceModuleName: this.serviceConfiguration.serviceName,
      resources: this._routerManager.getExpositionDetails(),
    };

    this.serviceSession.mainChannel.publish(exchangeName, routingKey, new Buffer(JSON.stringify(message)));
  }

  protected createRPCAuthorizationDynamic(): void {
    if (this.isMainService)
      this._eventManager.registerDelegate(TokenValidationResponseRPC).processTokenAction = tvr =>
        this.processTokenValidationRequest(tvr);
    else this._eventManager.registerEvent(TokenValidationRequestRPC);
  }

  protected processTokenValidationRequest(tokenValidationRequest: TokenValidationRequest): Promise<TokenValidationResponse> {
    this.serviceSession.throwException('No setted process for token validation request');
    return null;
  }

  protected requestTokenValidation(token: string, request: express.Request): Promise<TokenValidationResponse> {
    return new Promise<TokenValidationResponse>((resolve, reject) => {
      let tokenValidationData = {
        token,
        requestPath: request.path,
        onResponse: tokenValidationResponse => resolve(tokenValidationResponse),
      };

      this._eventManager.publish('TokenValidationRequestRPC', tokenValidationData);
    });
  }

  protected requestTokenValidationWithCache(token: string, request: express.Request): Promise<TokenValidationResponse> {
    return new Promise<TokenValidationResponse>((resolve, reject) =>
      this.getTokenValidationCache(token, request)
        .then(result => {
          if (!result.exists)
            this.requestTokenValidation(token, request)
              .then(res => {
                if (res.success)
                  this.setTokenValidationCache(token, request, res)
                    .then(() => resolve(res))
                    .catch(reject);
                else resolve(res);
              })
              .catch(reject);
          else resolve(result.cacheResult);
        })
        .catch(reject)
    );
  }

  protected getTokenValidationCache(
    token: string,
    request: express.Request
  ): Promise<{ exists: boolean; cacheResult?: TokenValidationResponse }> {
    return new Promise<{ exists: boolean; cacheResult?: TokenValidationResponse }>((resolve, reject) => {
      let keyCache = this.createKeyCache(token, request);
      this.serviceSession.authCacheClient.get('tokenValidation:' + keyCache, (error, value) => {
        if (!error) {
          if (value) {
            let cacheResult: TokenValidationResponse = JSON.parse(value);
            resolve({ exists: true, cacheResult });
          } else resolve({ exists: false });
        } else reject(error);
      });
    });
  }

  protected setTokenValidationCache(
    token: string,
    request: express.Request,
    result: TokenValidationResponse
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let keyCache = this.createKeyCache(token, request);
      let resultString = JSON.stringify(result);
      this.serviceSession.authCacheClient.set(
        'tokenValidation:' + keyCache,
        resultString,
        'EX',
        this.sessionRefreshPeriod,
        error => {
          if (!error) resolve();
          else reject(error);
        }
      );
    });
  }

  protected createKeyCache(token: string, request: express.Request): string {
    // let keyCacheToProcess = token + '-' + request.method + '-' + request.originalUrl;
    // return crypto.createHash('sha256').update(keyCacheToProcess).digest().toString();

    return request.method + '-' + request.originalUrl + '-' + token;
  }

  protected validateToken(token: string, request?: express.Request): Promise<TokenValidationResponse> {
    if (this.serviceConfiguration.useCacheForTokens) return this.requestTokenValidationWithCache(token, request);
    else return this.requestTokenValidation(token, request);
  }

  protected configureLogger(): void {
    if (this.serviceConfiguration.logger) {
      EntifixLogger.setLevel(this.serviceConfiguration.logger.level);
      EntifixLogger.setFormat(this.serviceConfiguration.logger.format);
    }
  }

  private localTrace(message: string, developer: string, method: string): void {
    EntifixLogger.trace({
      message,
      developer,
      origin: { class: 'EntifixApplication', file: 'entifix-aplication', method },
    });
  }

  private localDebug(message: string, developer: string, method: string): void {
    EntifixLogger.debug({
      message,
      developer,
      origin: { class: 'EntifixApplication', file: 'entifix-aplication', method },
    });
  }

  private localError(message: string, developer: string, method: string): void {
    EntifixLogger.error({
      message,
      developer,
      origin: { class: 'EntifixApplication', file: 'entifix-aplication', method },
    });
  }

  //#endregion

  //#region Accessors

  private get isMainService() {
    return this.serviceConfiguration.isMainService != null ? this.serviceConfiguration.isMainService : false;
  }

  public get expressApp() {
    return this._expressApp;
  }

  protected get routerManager() {
    return this._routerManager;
  }

  protected get eventManager() {
    return this._eventManager;
  }

  protected get serviceSession() {
    return EMServiceSession.instance;
  }

  get useDefaultAMQPInteraction() {
    return this.serviceConfiguration.amqpService != null && this.serviceConfiguration.amqpDefaultInteraction != false;
  }

  get sessionSecret() {
    if (this.serviceConfiguration && this.serviceConfiguration.session && this.serviceConfiguration.session.tokenSecret)
      return this.serviceConfiguration.session.tokenSecret;
    else this.serviceSession.throwException('No token secret defined');
  }

  get sessionExpirationLimit() {
    if (this.serviceConfiguration && this.serviceConfiguration.session && this.serviceConfiguration.session.expireLimit)
      return this.serviceConfiguration.session.expireLimit;
    else this.serviceSession.throwException('No expiration limit defined');
  }

  get sessionRefreshPeriod() {
    if (this.serviceConfiguration && this.serviceConfiguration.session && this.serviceConfiguration.session.refreshPeriod)
      return this.serviceConfiguration.session.refreshPeriod;
    else this.serviceSession.throwException('No refresh period defined');
  }

  get on() {
    return this._eventEmitter.on;
  }

  get emit() {
    return this._eventEmitter.emit;
  }

  get status() {
    return this._status;
  }

  //#endregion
}

function Consumer(idReq, resolvePromise) {
  this.onConsume = function (message: amqp.Message) {
    let a = 3;
    let b = this;
    if (message.properties.correlationId == this.idRequest) {
      let validation: TokenValidationResponse = JSON.parse(message.content.toString());
      resolvePromise(validation);
    }
  };
}

export { EntifixApplication, EntifixAppConfig, MongoServiceConfig };
