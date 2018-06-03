"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hcWrapper_1 = require("../../hcWrapper/hcWrapper");
const emSession_1 = require("../emSession/emSession");
class EMResponseWrapper {
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
    error(response, message, code) {
        response.statusCode = code;
        response.send(hcWrapper_1.Wrapper.wrapError(message, null).serializeSimpleObject());
    }
    sessionError(response, error) {
        response.statusCode = 500;
        if (error instanceof emSession_1.EMSessionError) {
            let e = error;
            let errorMessage;
            if (e.error)
                errorMessage = e.error.name + ' - ' + e.error.message;
            else
                errorMessage = e.message;
            response.send(hcWrapper_1.Wrapper.wrapError(errorMessage, e.error).serializeSimpleObject());
        }
        else
            response.send('INTERNAL UNHANDLED ERROR');
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