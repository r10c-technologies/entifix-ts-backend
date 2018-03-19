/// <reference types="express" />
import express = require('express');
import { EMSession } from '../emSession/emSession';
import { EMEntityController } from '../emEntityController/emEntityController';
import { EMEntity, EntityDocument } from '../emEntity/emEntity';
declare class EMRouterManager {
    private _session;
    private _appInstance;
    private _routers;
    constructor(session: EMSession, appInstance: express.Application);
    exposeEntity<TDocument extends EntityDocument, TEntity extends EMEntity>(entityName: string): void;
    exposeEntity<TDocument extends EntityDocument, TEntity extends EMEntity>(entityName: string, controller: EMEntityController<TDocument, TEntity>): void;
    readonly session: EMSession;
    readonly appInstance: express.Application;
}
export { EMRouterManager };
