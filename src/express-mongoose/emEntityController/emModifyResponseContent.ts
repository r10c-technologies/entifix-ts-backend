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

    static modify<TEntity extends EMEntity>(request : express.Request, entityInfo : EntityInfo, results : Array<TEntity>, session : EMSession) : Promise<any>
    {
        return new Promise<any>((resolve, reject) => {
            let options = {
                host: session.serviceSession.reportsService.host,
                port: session.serviceSession.reportsService.port,
                path: session.serviceSession.reportsService.path + "/" + request.get(HeaderModifier.RequestedType),
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

            requestToReportsService.on("error", error => { reject(error); });
            requestToReportsService.write(JSON.stringify(EMModifyResponseContent.getRequestBody(request, entityInfo, results)));
            requestToReportsService.end();
        });
    }

    static getRequestBody<TEntity extends EMEntity>(request : express.Request, entityInfo : EntityInfo, results : Array<TEntity>) : any
    {
        return {
            title: entityInfo.display,
            columns: EMModifyResponseContent.getColumns(entityInfo),
            tableStriped: request.get(HeaderModifier.TableStriped) || true,
            pageSize: request.get(HeaderModifier.PageSize) || PageSize.Letter,
            pageOrientation: request.get(HeaderModifier.PageOrientation) || PageOrientations.Landscape,
            data: EMModifyResponseContent.getData(entityInfo, results)
        };
    }
    
    static getColumns(entityInfo : EntityInfo) : any
    {
        let columns = [], counter = 1;

        entityInfo.getAccessors().forEach((accessor) => { if (EMModifyResponseContent.includeAccessor(accessor)) { columns.push({ description: accessor.display, columnName: "Field_" + counter }); counter++; } });

        return columns;
    }
    
    static getData<TEntity extends EMEntity>(entityInfo : EntityInfo, results : Array<TEntity>) : any
    {
        let data = [];

        results.forEach((row) => {
            let dataRow = {}, counter = 1;
            entityInfo.getAccessors().forEach((accessor) => { if (EMModifyResponseContent.includeAccessor(accessor)) { dataRow["Field_" +  counter] = row[accessor.name] || ""; counter++; } });
            data.push(dataRow);
        });

        return data;
    }

    private static includeAccessor(accessor : AccessorInfo) : boolean
    {
        return (accessor.exposition == ExpositionType.Normal || accessor.exposition == ExpositionType.ReadOnly);
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

export { EMModifyResponseContent }