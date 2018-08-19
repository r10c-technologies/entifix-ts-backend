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
const emEntity_1 = require("../emEntity/emEntity");
const hcMetaData_1 = require("../../hc-core/hcMetaData/hcMetaData");
let ResourceDetail = class ResourceDetail extends emEntity_1.EMEntity {
    //#region Properties (Fields)
    //#endregion
    //#region Methods
    //#endregion
    //#region Accessors (Properties)
    get resourceName() { return this._document.resourceName; }
    set resourceName(value) { this._document.resourceName = value; }
    get apiUrl() { return this._document.apiUrl; }
    set apiUrl(value) { this._document.apiUrl = value; }
};
__decorate([
    hcMetaData_1.DefinedAccessor({ exposed: true, schema: { type: String, require: true } }),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], ResourceDetail.prototype, "resourceName", null);
__decorate([
    hcMetaData_1.DefinedAccessor({ exposed: true, schema: { type: String, require: true } }),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], ResourceDetail.prototype, "apiUrl", null);
ResourceDetail = __decorate([
    hcMetaData_1.DefinedEntity()
], ResourceDetail);
exports.ResourceDetail = ResourceDetail;
//# sourceMappingURL=resource-detail.js.map