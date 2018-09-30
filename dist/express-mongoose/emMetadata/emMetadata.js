"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hcMetaData_1 = require("../../hc-core/hcMetaData/hcMetaData");
class EMMemberActivator extends hcMetaData_1.MemberActivator {
    constructor(entityInfo, bindingType, extendRoute, options) {
        super(entityInfo);
        this._bindingType = bindingType;
        this._extendRoute = extendRoute;
        this._resourcePath = options != null && options.resourcePath != null ? options.resourcePath : null;
    }
    activateMember(entity, session, accessorInfo) {
        switch (this._bindingType) {
            case MemberBindingType.Reference:
                if (entity[accessorInfo.name] instanceof Array)
                    return this.loadArrayInstanceFromDB(entity, session, accessorInfo);
                else
                    return this.loadSingleInstanceFromDB(entity, session, accessorInfo);
            case MemberBindingType.Snapshot:
                if (entity[accessorInfo.name] instanceof Array)
                    return this.castArrayInstanceInEntity(entity, session, accessorInfo);
                else
                    return this.castSingleInstanceInEntity(entity, session, accessorInfo);
        }
    }
    loadSingleInstanceFromDB(entity, session, accessorInfo) {
        let doc = entity.getDocument();
        let persistentMember = accessorInfo.persistentAlias || accessorInfo.name;
        let id = doc[persistentMember];
        return session.findEntity(this.entityInfo, id).then(entityMemberInstance => { entity[accessorInfo.name] = entityMemberInstance; });
    }
    loadArrayInstanceFromDB(entity, session, accessorInfo) {
        let doc = entity.getDocument();
        let persistentMember = accessorInfo.persistentAlias || accessorInfo.name;
        let filters = { _id: { $in: doc[persistentMember] } };
        return session.listEntitiesByQuery(this.entityInfo, filters).then(entities => { entity[accessorInfo.name] = entities; });
    }
    castSingleInstanceInEntity(entity, session, accessorInfo) {
        let doc = entity.getDocument();
        let persistentMember = accessorInfo.persistentAlias || accessorInfo.name;
        let docData = doc[persistentMember];
        let model = session.getModel(this.entityInfo.name);
        let document = new model(docData);
        return session.activateEntityInstance(this.entityInfo, document).then(entity => { entity[accessorInfo.name] = entity; });
    }
    castArrayInstanceInEntity(entity, session, accessorInfo) {
        return new Promise((resolve, reject) => {
            let doc = entity.getDocument();
            let persistentMember = accessorInfo.persistentAlias || accessorInfo.name;
            let docsData = doc[persistentMember];
            let model = session.getModel(this.entityInfo.name);
            let promises = new Array();
            let entities = new Array();
            docsData.foreach(d => promises.push(session.activateEntityInstance(this.entityInfo, new model(d)).then(entity => { entities.push(entity); })));
            Promise.all(promises).then(() => resolve(), error => reject(error));
        });
    }
    //#endregion
    //#region Accessors
    get bindingType() { return this._bindingType; }
    get extendRoute() { return this._extendRoute; }
    get resourcePath() { return this._resourcePath || this.entityInfo.name.toLowerCase(); }
}
exports.EMMemberActivator = EMMemberActivator;
var MemberBindingType;
(function (MemberBindingType) {
    MemberBindingType[MemberBindingType["Reference"] = 1] = "Reference";
    MemberBindingType[MemberBindingType["Snapshot"] = 2] = "Snapshot";
})(MemberBindingType || (MemberBindingType = {}));
exports.MemberBindingType = MemberBindingType;
//# sourceMappingURL=emMetadata.js.map