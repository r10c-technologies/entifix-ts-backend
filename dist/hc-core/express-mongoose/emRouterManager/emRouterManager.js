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
    exposeEntity(entityName, controller) {
        let entityController;
        if (controller == null)
            entityController = new emEntityController_1.EMEntityController(entityName, this._session);
        else
            entityController = controller;
        this._routers.push({ entityName: entityName, controller: entityController });
        this._appInstance.use('/api', entityController.router);
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