"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hcWrapper_1 = require("../../hc-core/hcWrapper/hcWrapper");
const emSession_1 = require("../emSession/emSession");
const HttpStatus = require("http-status-codes");
class EMResponseWrapper {
    //#endregion
    //#region Methods
    constructor(session) {
        this._session = session;
    }
    object(response, object, options) {
        let devData = options != null ? options.devData : null;
        response.statusCode = options != null && options.status != null ? options.status : HttpStatus.OK;
        response.send(hcWrapper_1.Wrapper.wrapObject(false, null, object, { devData }).serializeSimpleObject());
    }
    document(response, document, options) {
        let devData = options != null ? options.devData : null;
        response.send(hcWrapper_1.Wrapper.wrapObject(false, null, document, { isEntity: false, devData }).serializeSimpleObject());
    }
    entity(response, entity, options) {
        let devData = options != null ? options.devData : null;
        let serializedEntity = entity ? entity.serializeExposedAccessors() : {};
        response.send(hcWrapper_1.Wrapper.wrapObject(false, null, serializedEntity, { isEntity: true, devData }).serializeSimpleObject());
    }
    documentCollection(response, documents, options) {
        let devData = options != null ? options.devData : null;
        response.send(hcWrapper_1.Wrapper.wrapCollection(false, null, documents, { devData }).serializeSimpleObject());
    }
    entityCollection(response, entities, options) {
        let devData = options != null ? options.devData : null;
        let serializedEntities = entities ? entities.map(a => a.serializeExposedAccessors()) : [];
        response.send(hcWrapper_1.Wrapper.wrapCollection(false, null, serializedEntities, { devData }).serializeSimpleObject());
    }
    exception(response, error) {
        response.statusCode = 500;
        if (error instanceof emSession_1.EMSessionError) {
            let e = error;
            let data;
            if (this._session.isDevMode) {
                data = { serviceStatus: 'Developer mode is enabled.', helper: "The error was ocurred in the Service's Session" };
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
        else {
            let data;
            if (this._session.isDevMode) {
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
//# sourceMappingURL=emWrapper.js.map