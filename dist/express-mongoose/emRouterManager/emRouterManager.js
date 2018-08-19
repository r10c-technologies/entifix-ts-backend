"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emEntityController_1 = require("../emEntityController/emEntityController");
class IExpositionDetail {
}
class EMRouterManager {
    //#endregion
    //#regrion Methods
    constructor(session, appInstance) {
        this._session = session;
        this._appInstance = appInstance;
        this._routers = new Array();
    }
    exposeEntity(entityName, options) {
        let basePath = options && options.basePath ? options.basePath : 'api';
        let resourceName = options && options.resourceName ? options.resourceName : null;
        let entityController;
        if (options && options.controller)
            entityController = options.controller;
        else
            entityController = new emEntityController_1.EMEntityController(entityName, this._session, resourceName);
        this._routers.push({ entityName: entityName, controller: entityController, basePath });
        this._appInstance.use('/' + basePath, entityController.router);
    }
    getExpositionDetails() {
        return this._routers.map(r => { return { entityName: r.entityName, resourceName: r.controller.resourceName, basePath: r.basePath }; });
    }
    //#endregion
    //#regrion Accessors (Properties)
    get session() {
        return this._session;
    }
    get appInstance() {
        return this._appInstance;
    }
}
exports.EMRouterManager = EMRouterManager;
//# sourceMappingURL=emRouterManager.js.map