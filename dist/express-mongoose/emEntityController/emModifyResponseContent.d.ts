import express = require('express');
import { EntityInfo } from '../../hc-core/hcMetaData/hcMetaData';
import { EMEntity } from '../emEntity/emEntity';
import { EMSession } from '../emSession/emSession';
declare class EMModifyResponseContent {
    static modificationRequested(request: express.Request): boolean;
    static canRequestThisType(request: express.Request, entityInfo: EntityInfo): boolean;
    static modify<TEntity extends EMEntity>(request: express.Request, entityInfo: EntityInfo, results: Array<TEntity>, session: EMSession): Promise<any>;
    static getRequestBody<TEntity extends EMEntity>(request: express.Request, entityInfo: EntityInfo, results: Array<TEntity>): any;
    static getColumns(entityInfo: EntityInfo): any;
    static getData<TEntity extends EMEntity>(entityInfo: EntityInfo, results: Array<TEntity>): any;
    private static includeAccessor;
}
export { EMModifyResponseContent };
