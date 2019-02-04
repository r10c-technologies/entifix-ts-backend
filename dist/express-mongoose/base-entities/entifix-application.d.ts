import express = require('express');
import cors = require('cors');
import amqp = require('amqplib/callback_api');
import { TokenValidationRequest, TokenValidationResponse } from '../../hc-core/hcUtilities/interactionDataModels';
import { EMRouterManager } from '../emRouterManager/emRouterManager';
import { EMServiceSession } from '../emServiceSession/emServiceSession';
import { AMQPEventManager } from '../../amqp-events/amqp-event-manager/AMQPEventManager';
interface EntifixAppConfig {
    serviceName: string;
    mongoService: string | MongoServiceConfig;
    amqpService?: string;
    amqpDefaultInteraction?: boolean;
    isMainService?: boolean;
    cors?: {
        enable: boolean;
        options?: cors.CorsOptions;
    };
    devMode?: boolean;
    protectRoutes?: {
        enable: boolean;
        header?: string;
        path?: string;
    };
    session?: {
        refreshPeriod?: number;
        expireLimit?: number;
        tokenSecret: string;
    };
    authCacheService?: {
        host: string;
        port: number;
    };
}
interface MongoServiceConfig {
    user: string;
    password: string;
    url: string;
    base?: string;
}
declare abstract class EntifixApplication {
    private _expressApp;
    private _serviceSession;
    private _routerManager;
    private _eventManager;
    private _authChannel;
    private _assertAuthQueue;
    constructor(port: number);
    protected abstract readonly serviceConfiguration: EntifixAppConfig;
    protected abstract registerEntities(): void;
    protected abstract exposeEntities(): void;
    protected abstract validateToken(token: string, request?: express.Request): Promise<TokenValidationResponse>;
    protected registerEventsAndDelegates(): void;
    private createExpressApp;
    private createServiceSession;
    protected createMiddlewareFunctions(): void;
    private protectRoutes;
    protected onServiceSessionCreated(): void;
    protected configSessionAMQPConneciton(): void;
    protected saveModuleAtached(message: amqp.Message): void;
    protected atachModule(exchangeName: string, routingKey: string): void;
    protected createRPCAuthorizationDynamic(): void;
    protected processTokenValidationRequest(tokenValidationRequest: TokenValidationRequest): Promise<TokenValidationResponse>;
    protected requestTokenValidation(token: string, request: express.Request): Promise<TokenValidationResponse>;
    protected requestTokenValidationWithCache(token: string, request: express.Request): Promise<TokenValidationResponse>;
    protected getTokenValidationCache(token: string, request: express.Request): Promise<{
        exists: boolean;
        cacheResult?: TokenValidationResponse;
    }>;
    protected setTokenValidationCache(token: string, request: express.Request, result: TokenValidationResponse): Promise<void>;
    protected createKeyCache(token: string, request: express.Request): string;
    private readonly isMainService;
    readonly expressApp: express.Application;
    protected readonly routerManager: EMRouterManager;
    protected readonly eventManager: AMQPEventManager;
    protected readonly serviceSession: EMServiceSession;
    readonly useDefaultAMQPInteraction: boolean;
    readonly sessionRefreshPeriod: number;
    readonly sessionExpireLimit: number;
    readonly sessionTokenSecret: string;
}
export { EntifixApplication, EntifixAppConfig, MongoServiceConfig };
