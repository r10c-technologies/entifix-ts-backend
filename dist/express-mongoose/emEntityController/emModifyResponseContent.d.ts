import express = require('express');
import { EntityInfo } from '../../hc-core/hcMetaData/hcMetaData';
import { EMEntity } from '../emEntity/emEntity';
import { EMSession } from '../emSession/emSession';
declare class EMModifyResponseContent {
    static modificationRequested(request: express.Request): boolean;
    static canRequestThisType(request: express.Request, entityInfo: EntityInfo): boolean;
    static modify<TEntity extends EMEntity>(request: express.Request | ReportPreferences, entityInfo: EntityInfo | EntifixReport, results: Array<TEntity>, session: EMSession): Promise<any>;
    static getRequestBody<TEntity extends EMEntity>(request: express.Request | {
        requestedType: string;
        tableStriped: boolean;
        pageSize: string;
        pageOrientation: string;
    }, entityInfo: EntityInfo | EntifixReport, results: Array<TEntity>): any;
    static getColumns(entityInfo: EntityInfo | EntifixReport): any;
    static getData<TEntity extends EMEntity>(entityInfo: EntityInfo | EntifixReport, results: Array<TEntity>): any;
    private static includeAccessor;
    private static instanceOfReportPreferences;
    private static instanceOfEntifixReport;
}
interface ReportPreferences {
    requestedType: string;
    tableStriped: boolean;
    pageSize: string;
    pageOrientation: string;
}
interface EntifixReport {
    display: string;
    accessors: ReportAccessor[];
}
interface ReportAccessor {
    display: string;
    name: string;
}
export { EMModifyResponseContent };
