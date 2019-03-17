"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hcMetaData_1 = require("../../hc-core/hcMetaData/hcMetaData");
const http = require("http");
class EMModifyResponseContent {
    //#region Properties (Fields)
    //#endregion
    //#region Methods    
    static modificationRequested(request) {
        return request.get(HeaderModifier.RequestedType) != null;
    }
    static canRequestThisType(request, entityInfo) {
        if (typeof entityInfo.allowRequestedType == "boolean")
            return entityInfo.allowRequestedType;
        else if (entityInfo.allowRequestedType instanceof Array)
            return (entityInfo.allowRequestedType.filter(type => type == request.get(HeaderModifier.RequestedType)).length > 0);
        else
            return (entityInfo.allowRequestedType.toString() == request.get(HeaderModifier.RequestedType));
    }
    static modify(request, entityInfo, results, session) {
        return new Promise((resolve, reject) => {
            let options = {
                host: session.serviceSession.reportsService.host,
                port: session.serviceSession.reportsService.port,
                path: session.serviceSession.reportsService.path + "/" + request.get(HeaderModifier.RequestedType),
                method: session.serviceSession.reportsService.methodToRequest,
                headers: { "Content-Type": "application/json" }
            };
            let chunkParts = [];
            let requestToReportsService = http.request(options, response => {
                response.on("data", chunk => chunkParts.push(chunk));
                response.on("end", () => { let chunkResponse = Buffer.concat(chunkParts); resolve(chunkResponse); });
                response.on("error", error => reject(error));
            });
            requestToReportsService.on("error", error => { reject(error); });
            requestToReportsService.write(JSON.stringify(EMModifyResponseContent.getRequestBody(request, entityInfo, results)));
            requestToReportsService.end();
        });
    }
    static getRequestBody(request, entityInfo, results) {
        return {
            title: entityInfo.display,
            columns: EMModifyResponseContent.getColumns(entityInfo),
            tableStriped: request.get(HeaderModifier.TableStriped) || true,
            pageSize: request.get(HeaderModifier.PageSize) || PageSize.Letter,
            pageOrientation: request.get(HeaderModifier.PageOrientation) || PageOrientations.Landscape,
            data: EMModifyResponseContent.getData(entityInfo, results)
        };
    }
    static getColumns(entityInfo) {
        let columns = [], counter = 1;
        entityInfo.getAccessors().forEach((accessor) => { if (EMModifyResponseContent.includeAccessor(accessor)) {
            columns.push({ description: accessor.display, columnName: "Field_" + counter });
            counter++;
        } });
        return columns;
    }
    static getData(entityInfo, results) {
        let data = [];
        results.forEach((row) => {
            let dataRow = {}, counter = 1;
            entityInfo.getAccessors().forEach((accessor) => { if (EMModifyResponseContent.includeAccessor(accessor)) {
                dataRow["Field_" + counter] = row[accessor.name] || "";
                counter++;
            } });
            data.push(dataRow);
        });
        return data;
    }
    static includeAccessor(accessor) {
        return (accessor.exposition == hcMetaData_1.ExpositionType.Normal || accessor.exposition == hcMetaData_1.ExpositionType.ReadOnly);
    }
}
exports.EMModifyResponseContent = EMModifyResponseContent;
var HeaderModifier;
(function (HeaderModifier) {
    HeaderModifier["RequestedType"] = "X-Requested-Type";
    HeaderModifier["PageSize"] = "X-Page-Size";
    HeaderModifier["TableStriped"] = "X-Table-Striped";
    HeaderModifier["PageOrientation"] = "X-Page-Orientation";
})(HeaderModifier || (HeaderModifier = {}));
var PageOrientations;
(function (PageOrientations) {
    PageOrientations["Landscape"] = "Landscape";
    PageOrientations["Portrait"] = "Portrait";
})(PageOrientations || (PageOrientations = {}));
var PageSize;
(function (PageSize) {
    PageSize["Letter"] = "Letter";
    PageSize["Legal"] = "Legal";
    PageSize["A0"] = "A0";
    PageSize["A1"] = "A1";
    PageSize["A2"] = "A2";
    PageSize["A3"] = "A3";
    PageSize["A4"] = "A4";
})(PageSize || (PageSize = {}));
//# sourceMappingURL=emModifyResponseContent.js.map