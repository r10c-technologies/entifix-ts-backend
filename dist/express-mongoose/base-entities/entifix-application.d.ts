import express = require('express');
import cors = require('cors');
import amqp = require('amqplib/callback_api');
import { EMSession } from '../emSession/emSession';
import { EMRouterManager } from '../emRouterManager/emRouterManager';
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
    private _session;
    private _routerManager;
    private _authChannel;
    private _nameAuthQueue;
    private _assertAuthQueue;
    private _authCacheClient;
    constructor(port: number);
    protected abstract readonly serviceConfiguration: EntifixAppConfig;
    protected abstract registerEntities(): void;
    protected abstract exposeEntities(): void;
    protected abstract validateToken(token: string, request?: express.Request): Promise<{
        success: boolean;
        message: string;
    }>;
    private createExpressApp;
    private createEntifixSession;
    private createMiddlewareFunctions;
    private protectRoutes;
    protected onSessionCreated(): void;
    protected configSessionAMQPConneciton(): void;
    protected saveModuleAtached(message: amqp.Message): void;
    protected atachModule(exchangeName: string, routingKey: string): void;
    protected createRPCAuthorizationDynamic(): void;
    protected requestTokenValidation(token: string): Promise<{
        success: boolean;
        message: string;
    }>;
    protected requestTokenValidationWithCache(token: string, request: express.Request): Promise<{
        success: boolean;
        message: string;
    }>;
    protected generateRequestTokenId(): string;
    protected getTokenValidationCache(token: string, request: express.Request): Promise<{
        exists: boolean;
        cacheResult?: {
            success: boolean;
            message: string;
        };
    }>;
    protected setTokenValidationCache(token: string, request: express.Request, result: {
        success: boolean;
        message: string;
    }): Promise<void>;
    protected createKeyCache(token: string, request: express.Request): string;
    private readonly isMainService;
    protected readonly session: EMSession;
    readonly expressApp: express.Application;
    protected readonly routerManager: EMRouterManager;
    private readonly cacheExpiration;
}
export { EntifixApplication, EntifixAppConfig };
