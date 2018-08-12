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
const hcMetaData_1 = require("../hcMetaData/hcMetaData");
let Entity = class Entity {
    //#endregion
    //#region Methods
    constructor() {
    }
    serializeExposedAccessors() {
        var simpleObject = {};
        this.entityInfo.getExposedAccessors().forEach(accessor => {
            let nameSerialized = accessor.persistentAlias || accessor.name;
            simpleObject[nameSerialized] = this[accessor.name];
        });
        return simpleObject;
    }
    static deserializePersistentAccessors(info, simpleObject) {
        var complexObject = {};
        info.getExposedAccessors().filter(accesor => accesor.schema != null || accesor.persistenceType == hcMetaData_1.PersistenceType.Auto).forEach(accessor => {
            let exposedName = accessor.persistentAlias || accessor.name;
            complexObject[accessor.name] = simpleObject[exposedName];
        });
        return complexObject;
    }
    static getInfo() {
        return this.prototype.entityInfo;
    }
};
Entity = __decorate([
    hcMetaData_1.DefinedEntity({ packageName: 'CORE', abstract: true }),
    __metadata("design:paramtypes", [])
], Entity);
exports.Entity = Entity;
//# sourceMappingURL=hcEntity.js.map