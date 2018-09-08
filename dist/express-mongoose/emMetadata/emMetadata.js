"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hcMetaData_1 = require("../../hc-core/hcMetaData/hcMetaData");
class EMMemberActivator extends hcMetaData_1.MemberActivator {
    //#region Properties
    //#endregion
    //#region Methods
    activateMember(entity, session, memberName) {
        let id = entity[memberName];
        return session.findEntity(this.entityInfo, id).then(entityMemberInstance => { entity[memberName] = entityMemberInstance; });
    }
}
exports.EMMemberActivator = EMMemberActivator;
//# sourceMappingURL=emMetadata.js.map