import express = require('express');
import { EntityInfo } from '../../hc-core/hcMetaData/hcMetaData';
import { EMEntity } from '../emEntity/emEntity';
import { EMSession } from '../emSession/emSession';
declare class EMModifyResponseContent {
    static modificationRequested(request: express.Request): boolean;
    static canRequestThisType(request: express.Request, entityInfo: EntityInfo): boolean;
    static modify<TEntity extends EMEntity>(request: express.Request | ReportPreferences, headers: EntityInfo | EntifixReport, session: EMSession, dataOptions: {
        entities?: Array<TEntity>;
    }): Promise<any>;
    static modify<TEntity extends EMEntity>(request: express.Request | ReportPreferences, headers: EntityInfo | EntifixReport, session: EMSession, dataOptions: {
        results?: Array<any>;
    }): Promise<any>;
    static getRequestBody(request: express.Request | {
        requestedType: string;
        tableStriped: boolean;
        pageSize: string;
        pageOrientation: string;
    }, headers: EntityInfo | EntifixReport, results: Array<any>): any;
    static getColumns(headers: EntityInfo | EntifixReport): any;
    static getData(headers: EntityInfo | EntifixReport, results: Array<any>): any;
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
    headers: ReportAccessor[];
}
interface ReportAccessor {
    display: string;
    name: string;
}
export { EMModifyResponseContent };
