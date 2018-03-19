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
const hcEntity_1 = require("../../hcEntity/hcEntity");
const emSession_1 = require("../emSession/emSession");
const hcMetaData_1 = require("../../hcMetaData/hcMetaData");
let EMEntity = class EMEntity extends hcEntity_1.Entity {
    constructor(session, document) {
        super();
        this._session = session;
        if (document)
            this._document = document;
    }
    save() {
        return new Promise((resolve, reject) => {
            this.onSaving();
            if (this._document._id) {
                this._session.updateDocument(this.entityInfo.name, this._document).then(documentUpdated => {
                    this._document = documentUpdated;
                    resolve();
                }, error => {
                    console.error('Erron on update a document insde an entity');
                    reject(error);
                });
            }
            else {
                this._session.createDocument(this.entityInfo.name, this._document).then(documentCreated => {
                    this._document = documentCreated;
                    resolve();
                }, error => {
                    console.error('Error on create a document inside an entity');
                    reject(error);
                });
            }
        });
    }
    delete() {
        return new Promise((resolve, reject) => {
            this.onDeleting();
            this.session.deleteDocument(this.entityInfo.name, this._document).then(() => resolve(), error => reject(error));
        });
    }
    onSaving() {
    }
    onDeleting() {
    }
    static getSchema() {
        return this.prototype.entityInfo.getCompleteSchema();
    }
    getDocument() {
        return this._document;
    }
    //#endregion
    //#region Accessors
    get session() { return this._session; }
    ;
    get created() { return this._document.created; }
    set created(value) { this._document.created = value; }
    get modified() { return this._document.modified; }
    set modified(value) { this._document.modified = value; }
    get deleted() { return this._document.deleted; }
    set deleted(value) { this._document.deleted = value; }
    get _id() { return this._document._id; }
    get __v() { return this._document.__v; }
    get deferredDeletion() { return this._document.deferredDeletion; }
    set deferredDeletion(value) { this.deferredDeletion = value; }
};
__decorate([
    hcMetaData_1.DefinedAccessor({ exposed: true, schema: { type: Date, require: true } }),
    __metadata("design:type", Date),
    __metadata("design:paramtypes", [Date])
], EMEntity.prototype, "created", null);
__decorate([
    hcMetaData_1.DefinedAccessor({ exposed: true, schema: { type: Date, require: false } }),
    __metadata("design:type", Date),
    __metadata("design:paramtypes", [Date])
], EMEntity.prototype, "modified", null);
__decorate([
    hcMetaData_1.DefinedAccessor({ exposed: true, schema: { type: Date, require: false } }),
    __metadata("design:type", Date),
    __metadata("design:paramtypes", [Date])
], EMEntity.prototype, "deleted", null);
__decorate([
    hcMetaData_1.DefinedAccessor({ exposed: true, persistenceType: hcMetaData_1.PersistenceType.Auto }),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [])
], EMEntity.prototype, "_id", null);
__decorate([
    hcMetaData_1.DefinedAccessor({ exposed: true, persistenceType: hcMetaData_1.PersistenceType.Auto }),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [])
], EMEntity.prototype, "__v", null);
__decorate([
    hcMetaData_1.DefinedAccessor({ exposed: false, schema: { type: Boolean, require: true } }),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], EMEntity.prototype, "deferredDeletion", null);
EMEntity = __decorate([
    hcMetaData_1.DefinedEntity({ packageName: 'CORE', abstract: true }),
    __metadata("design:paramtypes", [emSession_1.EMSession, Object])
], EMEntity);
exports.EMEntity = EMEntity;
//# sourceMappingURL=emEntity.js.map