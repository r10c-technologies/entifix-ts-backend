import express = require('express')
import { EntityInfo, AccessorInfo, ExpositionType } from '../../hc-core/hcMetaData/hcMetaData';
import { EMEntity } from '../emEntity/emEntity';
import { EMSession } from '../emSession/emSession';
import http = require('http');

class EMModifyResponseContent
{
    //#region Properties (Fields)
    
    
    //#endregion
    
    
    //#region Methods    
    static modificationRequested(request : express.Request) : boolean
    {
        return request.get(HeaderModifier.RequestedType) != null; 
    }

    static canRequestThisType(request : express.Request, entityInfo : EntityInfo) : boolean
    {
        if (typeof entityInfo.allowRequestedType == "boolean")
            return entityInfo.allowRequestedType;
        else if (entityInfo.allowRequestedType instanceof Array)
            return (entityInfo.allowRequestedType.filter(type => type == request.get(HeaderModifier.RequestedType)).length > 0);
        else
            return (entityInfo.allowRequestedType.toString() == request.get(HeaderModifier.RequestedType));
    }

    static modify<TEntity extends EMEntity>(request : express.Request | ReportPreferences, headers : EntityInfo | EntifixReport, session : EMSession, dataOptions : { entities ?: Array<TEntity> }) : Promise<any>
    static modify<TEntity extends EMEntity>(request : express.Request | ReportPreferences, headers : EntityInfo | EntifixReport, session : EMSession, dataOptions : { results ?: Array<any> }) : Promise<any>
    static modify<TEntity extends EMEntity>(request : express.Request | ReportPreferences, headers : EntityInfo | EntifixReport, session : EMSession, dataOptions : { entities ?: Array<TEntity>, results ?: Array<any> }) : Promise<any>
    {
        return new Promise<any>((resolve, reject) => {
            let options = {
                host: session.serviceSession.reportsService.host,
                port: session.serviceSession.reportsService.port,
                path: session.serviceSession.reportsService.path + "/" + (EMModifyResponseContent.instanceOfReportPreferences(request) ? (request as ReportPreferences).requestedType : (request as express.Request).get(HeaderModifier.RequestedType)),
                method: session.serviceSession.reportsService.methodToRequest,
                headers: { "Content-Type": "application/json" }
            };

            let chunkParts = [];

            let requestToReportsService = http.request(
                options,
                response => {
                    response.on("data", chunk => chunkParts.push(chunk));
                    response.on("end", () => { let chunkResponse = Buffer.concat(chunkParts); resolve(chunkResponse); });
                    response.on("error", error => reject(error));
                }
            );

            let data = (dataOptions.entities || dataOptions.results);

            requestToReportsService.on("error", error => { reject(error); });
            requestToReportsService.write(JSON.stringify(EMModifyResponseContent.getRequestBody(request, headers, data)));
            requestToReportsService.end();
        });
    }

    static getRequestBody<TEntity extends EMEntity>(request : express.Request | { requestedType: string, tableStriped: boolean, pageSize: string, pageOrientation: string }, headers : EntityInfo | EntifixReport, results : Array<any>) : any
    {
        return {
            title: headers.display,
            columns: EMModifyResponseContent.getColumns(headers),
            tableStriped: (EMModifyResponseContent.instanceOfReportPreferences(request) ? (request as ReportPreferences).tableStriped : (request as express.Request).get(HeaderModifier.TableStriped)) || true,
            pageSize: (EMModifyResponseContent.instanceOfReportPreferences(request) ? (request as ReportPreferences).pageSize : (request as express.Request).get(HeaderModifier.PageSize)) || PageSize.Letter,
            pageOrientation: (EMModifyResponseContent.instanceOfReportPreferences(request) ? (request as ReportPreferences).pageOrientation : (request as express.Request).get(HeaderModifier.PageOrientation)) || PageOrientations.Landscape,
            data: EMModifyResponseContent.getData(headers, results)
        };
    }
    
    static getColumns(headers : EntityInfo | EntifixReport) : any
    {
        let columns = [], counter = 1;

        if (EMModifyResponseContent.instanceOfEntifixReport(headers)) {
            (headers as EntifixReport).headers.forEach((accessor) => { columns.push({ description: accessor.display, columnName: "Field_" + counter }); counter++; });
        } else {
            (headers as EntityInfo).getAccessors().forEach((accessor) => { if (EMModifyResponseContent.includeAccessor(accessor)) { columns.push({ description: accessor.display, columnName: "Field_" + counter }); counter++; } });
        }

        return columns;
    }
    
    static getData<TEntity extends EMEntity>(headers : EntityInfo | EntifixReport, results : Array<any>) : any
    {
        let data = [];

        results.forEach((row) => {
            let dataRow = {}, counter = 1;
            if (EMModifyResponseContent.instanceOfEntifixReport(headers)) {
                (headers as EntifixReport).headers.forEach((accessor) => { dataRow["Field_" +  counter] = row[accessor.name] || ""; counter++; });
            } else {
                (headers as EntityInfo).getAccessors().forEach((accessor) => { if (EMModifyResponseContent.includeAccessor(accessor)) { dataRow["Field_" +  counter] = row[accessor.name] || ""; counter++; } });
            }
            data.push(dataRow);
        });

        return data;
    }

    private static includeAccessor(accessor : AccessorInfo) : boolean
    {
        return (accessor.exposition == ExpositionType.Normal || accessor.exposition == ExpositionType.ReadOnly);
    }

    private static instanceOfReportPreferences(object : any) : boolean
    {
        return 'requestedType' in object;
    }

    private static instanceOfEntifixReport(object : any) : boolean
    {
        return 'accessors' in object;
    }
    
    //#endregion


    //#region Accessors (Properties)
    
    
    
    //#endregion
    
}

enum HeaderModifier {
    RequestedType = "X-Requested-Type",
    PageSize = "X-Page-Size",
    TableStriped = "X-Table-Striped",
    PageOrientation = "X-Page-Orientation"
}

enum PageOrientations {
    Landscape = "Landscape",
    Portrait = "Portrait"
}

enum PageSize {
    Letter = "Letter", 
    Legal = "Legal",
    A0 = "A0",
    A1 = "A1",
    A2 = "A2",
    A3 = "A3",
    A4 = "A4"
}

interface ReportPreferences { 
    requestedType: string, 
    tableStriped: boolean, 
    pageSize: string, 
    pageOrientation: string 
}

interface EntifixReport {
    display: string,
    headers: ReportAccessor[]
}

interface ReportAccessor {
    display: string,
    name: string
}

export { EMModifyResponseContent }