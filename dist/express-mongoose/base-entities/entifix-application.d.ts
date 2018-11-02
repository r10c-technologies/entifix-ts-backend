import express = require('express');
import cors = require('cors');
import amqp = require('amqplib/callback_api');
import { TokenValidation } from '../../hc-core/hcUtilities/interactionDataModels';
import { EMRouterManager } from '../emRouterManager/emRouterManager';
import { EMServiceSession } from '../emServiceSession/emServiceSession';
interface EntifixAppConfig {
    serviceName: string;
    mongoService: string;
    amqpService?: string;
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
declare abstract class EntifixApplication {
    private _expressApp;
    private _serviceSession;
    private _routerManager;
    private _authChannel;
    private _nameAuthQueue;
    private _assertAuthQueue;
    private _authCacheClient;
    constructor(port: number);
    protected abstract readonly serviceConfiguration: EntifixAppConfig;
    protected abstract registerEntities(): void;
    protected abstract exposeEntities(): void;
    protected abstract validateToken(token: string, request?: express.Request): Promise<TokenValidation>;
    private createExpressApp;
    private createServiceSession;
    protected createMiddlewareFunctions(): void;
    private protectRoutes;
    protected onServiceSessionCreated(): void;
    protected configSessionAMQPConneciton(): void;
    protected saveModuleAtached(message: amqp.Message): void;
    protected atachModule(exchangeName: string, routingKey: string): void;
    protected createRPCAuthorizationDynamic(): void;
    protected requestTokenValidation(token: string): Promise<TokenValidation>;
    protected requestTokenValidationWithCache(token: string, request: express.Request): Promise<TokenValidation>;
    protected generateRequestTokenId(): string;
    protected getTokenValidationCache(token: string, request: express.Request): Promise<{
        exists: boolean;
        cacheResult?: TokenValidation;
    }>;
    protected setTokenValidationCache(token: string, request: express.Request, result: TokenValidation): Promise<void>;
    protected createKeyCache(token: string, request: express.Request): string;
    private readonly isMainService;
    readonly expressApp: express.Application;
    protected readonly routerManager: EMRouterManager;
    private readonly cacheExpiration;
    protected readonly serviceSession: EMServiceSession;
}
export { EntifixApplication, EntifixAppConfig };
