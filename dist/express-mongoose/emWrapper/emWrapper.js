"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hcWrapper_1 = require("../../hc-core/hcWrapper/hcWrapper");
const emServiceSession_1 = require("../emServiceSession/emServiceSession");
const HttpStatus = require("http-status-codes");
class EMResponseWrapper {
    //#endregion
    //#region Methods
    constructor(serviceSession) {
        this._serviceSession = serviceSession;
    }
    object(response, object, options) {
        let devData = options != null ? options.devData : null;
        response.statusCode = options != null && options.status != null ? options.status : HttpStatus.OK;
        response.send(hcWrapper_1.Wrapper.wrapObject(false, null, object, { devData }).serializeSimpleObject());
    }
    file(response, file, options) {
        let devData = options != null ? options.devData : null;
        response.statusCode = options != null && options.status != null ? options.status : HttpStatus.OK;
        response.send(file);
    }
    collection(response, collection, options) {
        let devData = options != null ? options.devData : null;
        let count = collection ? collection.length : 0;
        let total = options && options.total ? options.total : count;
        let take = options && options.take ? options.take : count;
        let page;
        if (take > 0)
            page = Math.trunc(total / take) + 1;
        else
            page = 1;
        response.send(hcWrapper_1.Wrapper.wrapCollection(false, null, collection, { devData, total, page, count, take }).serializeSimpleObject());
    }
    exception(response, error) {
        response.statusCode = 500;
        if (error instanceof emServiceSession_1.EMSessionError) {
            let e = error;
            if (e.isHandled) {
                response.statusCode = e.code;
                let errorData = e.error || {};
                if (!errorData.serviceStatus)
                    errorData.serviceStatus = 'Developer mode is enabled.';
                if (!errorData.helper)
                    errorData.helper = "The error did not occur on the Service's Session";
                response.send(hcWrapper_1.Wrapper.wrapError(e.message.toUpperCase(), errorData).serializeSimpleObject());
            }
            else {
                let data;
                if (this._serviceSession.isDevMode) {
                    data = { serviceStatus: 'Developer mode is enabled.', helper: "The error did not ocur on the Service's Session" };
                    if (error) {
                        data.errorDetails = { sessionMessage: e.message };
                        if (e.error) {
                            data.errorDetails.sessionError = {
                                type: typeof e.error,
                                asString: e.error.toString != null ? e.error.toString() : null,
                                serialized: JSON.stringify(e.error),
                                message: e.error.message,
                                stack: e.error.stack
                            };
                        }
                    }
                }
                response.send(hcWrapper_1.Wrapper.wrapError('INTERNAL UNHANDLED EXCEPTION', data).serializeSimpleObject());
            }
        }
        else {
            let data;
            if (this._serviceSession.isDevMode) {
                data = { serviceStatus: 'Developer mode is enabled.', helper: "The error was not ocurred in a known context. The details were attached" };
                if (error)
                    data.errorDetails = {
                        type: typeof error,
                        asString: error.toString != null ? error.toString() : null,
                        serialized: JSON.stringify(error),
                        message: error.message,
                        stack: error.stack
                    };
            }
            response.send(hcWrapper_1.Wrapper.wrapError('INTERNAL UNHANDLED EXCEPTION', data).serializeSimpleObject());
        }
    }
    handledError(response, message, status, errorDetails) {
        response.statusCode = status;
        response.send(hcWrapper_1.Wrapper.wrapError(message.toUpperCase(), errorDetails).serializeSimpleObject());
    }
    logicError(response, message, options) {
        let errorDetails = options != null ? options.errorDetails : null;
        let devData = options != null ? options.devData : null;
        response.send(hcWrapper_1.Wrapper.wrapObject(true, message, errorDetails, { devData }).serializeSimpleObject());
    }
    logicAccept(response, message, details) {
        response.send(hcWrapper_1.Wrapper.wrapObject(false, message, details != null ? details : {}).serializeSimpleObject());
    }
}
exports.EMResponseWrapper = EMResponseWrapper;
class EMResponseEntityWrapper extends EMResponseWrapper {
    document(response, document, options) {
        let devData = options != null ? options.devData : null;
        response.send(hcWrapper_1.Wrapper.wrapObject(false, null, document, { isEntity: false, devData }).serializeSimpleObject());
    }
    entity(response, entity, options) {
        let devData = options != null ? options.devData : null;
        let serializedEntity = entity && entity.serializeExposedAccessors ? entity.serializeExposedAccessors() : undefined;
        if (serializedEntity)
            response.send(hcWrapper_1.Wrapper.wrapObject(false, null, serializedEntity ? serializedEntity : entity, { isEntity: true, devData }).serializeSimpleObject());
        else
            response.send(hcWrapper_1.Wrapper.wrapObject(false, null, entity, { isEntity: true, devData }).serializeSimpleObject());
    }
    documentCollection(response, documents, options) {
        let devData = options != null ? options.devData : null;
        let count = documents ? documents.length : 0;
        let total = options && options.total ? options.total : count;
        let take = options && options.take ? options.take : count;
        let page;
        if (take > 0)
            page = Math.trunc(total / take) + 1;
        else
            page = 1;
        response.send(hcWrapper_1.Wrapper.wrapCollection(false, null, documents, { devData, total, page, count, take }).serializeSimpleObject());
    }
    entityCollection(response, entities, options) {
        let devData = options != null ? options.devData : null;
        let count = entities ? entities.length : 0;
        let total = options && options.total ? options.total : count;
        let take = options && options.take ? options.take : count;
        let page;
        if (take > 0)
            page = Math.trunc(total / take) + 1;
        else
            page = 1;
        let serializedEntities = entities ? entities.map(a => a.serializeExposedAccessors()) : [];
        response.send(hcWrapper_1.Wrapper.wrapCollection(false, null, serializedEntities, { devData, total, page, count, take }).serializeSimpleObject());
    }
}
exports.EMResponseEntityWrapper = EMResponseEntityWrapper;
//# sourceMappingURL=emWrapper.js.map