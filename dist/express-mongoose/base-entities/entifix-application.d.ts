import express = require('express');
import cors = require('cors');
import amqp = require('amqplib/callback_api');
import { TokenValidationRequest, TokenValidationResponse } from '../../hc-core/hcUtilities/interactionDataModels';
import { EMRouterManager } from '../emRouterManager/emRouterManager';
import { EMServiceSession } from '../emServiceSession/emServiceSession';
interface EntifixAppConfig {
    serviceName: string;
    mongoService: string | MongoServiceConfig;
    amqpService?: string;
    amqpDefaultInteraction?: boolean;
    authCacheService?: string;
    authCacheServicePort?: number;
    authCacheDuration?: number;
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
    private _authCacheClient;
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
    private readonly cacheExpiration;
    protected readonly serviceSession: EMServiceSession;
    readonly useDefaultAMQPInteraction: boolean;
}
export { EntifixApplication, EntifixAppConfig, MongoServiceConfig };
