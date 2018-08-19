import express = require('express');
import cors = require('cors');
import amqp = require('amqplib/callback_api');
import { EMSession } from '../emSession/emSession';
import { EMRouterManager } from '../emRouterManager/emRouterManager';
interface EntifixAppConfig {
    serviceName: string;
    mongoService: string;
    amqpService?: string;
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
    constructor(port: number);
    protected abstract readonly serviceConfiguration: EntifixAppConfig;
    protected abstract registerEntities(): void;
    protected abstract exposeEntities(): void;
    protected abstract validateToken(token: string): Promise<{
        success: boolean;
        message: string;
    }>;
    private createExpressApp;
    private createEntifixSession;
    private createMiddlewareFunctions;
    private protectRoutes;
    protected onSessionCreated(): void;
    protected saveModuleAtached(message: amqp.Message): void;
    protected atachModule(exchangeName: string, routingKey: string): void;
    protected createRPCAuthorizationDynamic(): void;
    protected requesTokenValidation(token: string): Promise<{
        success: boolean;
        message: string;
    }>;
    protected generateRequestId(): string;
    private readonly isMainService;
    protected readonly session: EMSession;
    readonly expressApp: express.Application;
    protected readonly routerManager: EMRouterManager;
}
export { EntifixApplication, EntifixAppConfig };
