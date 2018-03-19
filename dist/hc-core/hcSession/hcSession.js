"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class HcSession {
    //#endregion
    //#region Methods
    constructor() {
        this._entitiesInfo = [];
    }
    addEntityInfo(entityInfo) {
        this.entitiesInfo.push(entityInfo);
    }
    //#endregion
    //#region Accessors (Properties)
    get entitiesInfo() {
        return this._entitiesInfo;
    }
}
exports.HcSession = HcSession;
//# sourceMappingURL=hcSession.js.map