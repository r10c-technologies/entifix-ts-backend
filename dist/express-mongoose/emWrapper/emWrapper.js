"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hcWrapper_1 = require("../../hc-core/hcWrapper/hcWrapper");
const emSession_1 = require("../emSession/emSession");
class EMResponseWrapper {
    //#region Properties
    //#endregion
    //#region Methods
    constructor(session) {
        this.session = session;
    }
    object(response, object, status) {
        response.statusCode = status || 200;
        response.send(hcWrapper_1.Wrapper.wrapObject(false, null, object).serializeSimpleObject());
    }
    document(response, document, status) {
        response.statusCode = status || 200;
        response.send(hcWrapper_1.Wrapper.wrapObject(false, null, document, true).serializeSimpleObject());
    }
    entity(response, entity, status) {
        response.statusCode = status || 200;
        response.send(hcWrapper_1.Wrapper.wrapObject(false, null, entity.serializeExposedAccessors(), true).serializeSimpleObject());
    }
    documentCollection(response, documents, status) {
        response.statusCode = status || 200;
        response.send(hcWrapper_1.Wrapper.wrapCollection(false, null, documents).serializeSimpleObject());
    }
    entityCollection(response, entities, status) {
        response.statusCode = status || 200;
        response.send(hcWrapper_1.Wrapper.wrapCollection(false, null, entities.map(a => a.serializeExposedAccessors())).serializeSimpleObject());
    }
    error(response, error, options) {
        response.statusCode = options && options.code ? options.code : 500;
        if (error instanceof emSession_1.EMSessionError) {
            let e = error;
            let data;
            if (this.session.isDevMode) {
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
            response.send(hcWrapper_1.Wrapper.wrapError('INTERNAL UNHANDLED ERROR', e.error).serializeSimpleObject());
        }
        else {
            let data;
            if (this.session.isDevMode) {
                data = { serviceStatus: 'Developer mode is enabled.', helper: "The error was not ocurred in the Service's Session. The details were attached" };
                if (error)
                    data.errorDetails = {
                        type: typeof error,
                        asString: error.toString != null ? error.toString() : null,
                        serialized: JSON.stringify(error),
                        message: error.message,
                        stack: error.stack
                    };
            }
            response.send(hcWrapper_1.Wrapper.wrapError('INTERNAL UNHANDLED ERROR', data).serializeSimpleObject());
        }
    }
    logicError(response, message, errorDetails) {
        response.send(hcWrapper_1.Wrapper.wrapObject(true, message, errorDetails != null ? errorDetails : {}).serializeSimpleObject());
    }
    logicAccept(response, message, details) {
        response.send(hcWrapper_1.Wrapper.wrapObject(false, message, details != null ? details : {}).serializeSimpleObject());
    }
}
exports.EMResponseWrapper = EMResponseWrapper;
//# sourceMappingURL=emWrapper.js.map