"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const HttpStatus = require("http-status-codes");
//Framework imports
const emEntityController_1 = require("../emEntityController/emEntityController");
class EMEntityMutltiKeyController extends emEntityController_1.EMEntityController {
    //#region Properties
    //#endregion
    //#region Methods
    createRoutes() {
        super.createRoutes();
        this._router.get('/by-key/:service/:entity/:id', (request, response, next) => this.retrieveByKey(request, response, next));
    }
    retrieveByKey(request, response, next) {
        this.createSession(request, response).then(session => {
            if (session) {
                let serviceName = request.params.service;
                let entityName = request.params.entity;
                let id = request.params.id;
                if (serviceName && entityName && id) {
                    let key = { serviceName, entityName, value: id };
                    session.findByKey(this.entityInfo, key).then(entity => this.responseWrapper.entity(response, entity)).catch(err => this.responseWrapper.exception(response, err));
                }
                else {
                    let responseWithError = messageDetails => this.responseWrapper.handledError(response, 'Incomplete request', HttpStatus.BAD_REQUEST, { details: messageDetails });
                    if (!serviceName)
                        responseWithError('It is necessary a service name: /<ServiceName>/<Entity>/<id>');
                    else if (!entityName)
                        responseWithError('It is necessary an entity name: /<ServiceName>/<Entity>/<id>');
                    else if (!id)
                        responseWithError('It is necessary an id: /<ServiceName>/<Entity>/<id>');
                }
            }
        });
    }
}
exports.EMEntityMutltiKeyController = EMEntityMutltiKeyController;
//# sourceMappingURL=emEntityMultiKeyController.js.map