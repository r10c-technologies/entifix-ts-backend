"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const hcMetaData_1 = require("../../hc-core/hcMetaData/hcMetaData");
const emEntity_1 = require("../emEntity/emEntity");
const emMetadata_1 = require("../emMetadata/emMetadata");
let EntityKey = class EntityKey extends emEntity_1.EMEntity {
    //#region Properties
    //#endregion
    //#region Methods
    //#endregion
    //#region Accessors
    get serviceName() { return this._document.serviceName; }
    set serviceName(value) { this._document.serviceName = value; }
    get entityName() { return this._document.entityName; }
    set entityName(value) { this._document.entityName = value; }
    get value() { return this._document.value; }
    set value(value) { this._document.value = value; }
};
__decorate([
    hcMetaData_1.DefinedAccessor({ exposition: hcMetaData_1.ExpositionType.Normal, schema: { type: String, required: true } }),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], EntityKey.prototype, "serviceName", null);
__decorate([
    hcMetaData_1.DefinedAccessor({ exposition: hcMetaData_1.ExpositionType.Normal, schema: { type: String, required: true } }),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], EntityKey.prototype, "entityName", null);
__decorate([
    hcMetaData_1.DefinedAccessor({ exposition: hcMetaData_1.ExpositionType.Normal, schema: { type: String, required: true } }),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], EntityKey.prototype, "value", null);
EntityKey = __decorate([
    hcMetaData_1.DefinedEntity({ packageName: 'CORE' })
], EntityKey);
exports.EntityKey = EntityKey;
let EMEntityMultiKey = class EMEntityMultiKey extends emEntity_1.EMEntity {
    //#region Properties
    //#endregion
    //#region Methods
    static isMultiKeyEntity(entityInfo) {
        let base = entityInfo.base;
        let isMultiKeyEntity = base ? base.name == 'EMEntityMultiKey' : false;
        while (base != null && !isMultiKeyEntity) {
            isMultiKeyEntity = base.name == 'EMEntityMultiKey';
            base = base.base;
        }
        return isMultiKeyEntity;
    }
    get keys() { return this._keys; }
    set keys(value) { this._keys = value; this._document.keys = value ? value.map(v => v.getDocument()) : null; }
};
__decorate([
    hcMetaData_1.DefinedAccessor({
        exposition: hcMetaData_1.ExpositionType.Normal,
        schema: { type: Array },
        activator: new emMetadata_1.EMMemberActivator(EntityKey.getInfo(), hcMetaData_1.MemberBindingType.Snapshot, true)
    }),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], EMEntityMultiKey.prototype, "keys", null);
EMEntityMultiKey = __decorate([
    hcMetaData_1.DefinedEntity({ packageName: 'CORE', abstract: true })
], EMEntityMultiKey);
exports.EMEntityMultiKey = EMEntityMultiKey;
//# sourceMappingURL=emEntityMultiKey.js.map