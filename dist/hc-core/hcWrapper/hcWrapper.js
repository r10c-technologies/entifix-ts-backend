"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Wrapper {
    //#region Properties
    //#endregion
    //#region Methods
    constructor() {
    }
    static wrapObject(isLogicError, message, object, isEntity) {
        return new WrappedObject(isLogicError, message, object, isEntity);
    }
    static wrapCollection(isLogicError, message, objectCollection, total, count, page) {
        objectCollection = objectCollection || [];
        total = total || objectCollection.length;
        count = count || objectCollection.length;
        page = page || 0;
        return new WrappedCollection(isLogicError, message, objectCollection, total, page, count);
    }
    static wrapError(errorDescription, error) {
        return new WrappedError(errorDescription, errorDescription);
    }
}
exports.Wrapper = Wrapper;
class WrappedResponse {
    //#endregion
    //#region Methods
    constructor(isLogicError, message) {
        this._isLogicError = isLogicError;
        this._message = message;
    }
    serializeSimpleObject() {
        return {
            isLogicError: this.isLogicError,
            message: this.message,
            info: { type: this._dataType }
        };
    }
    ;
    //#endregion 
    //#region Accessors
    get isLogicError() { return this._isLogicError; }
    set isLogicError(value) { this._isLogicError = value; }
    get message() { return this._message; }
    set message(value) { this._message = value; }
}
exports.WrappedResponse = WrappedResponse;
class WrappedObject extends WrappedResponse {
    constructor(isLogicError, message, data, isEntity) {
        super(isLogicError, message);
        this._data = data;
        if (isEntity == true)
            this._dataType = 'Entity';
        else
            this._dataType = 'Object';
    }
    serializeSimpleObject() {
        var simpleObject = super.serializeSimpleObject();
        simpleObject.data = this.data;
        return simpleObject;
    }
    //#endregion
    //#region Accessors
    get data() { return this._data; }
    set data(value) { this._data = value; }
}
exports.WrappedObject = WrappedObject;
class WrappedCollection extends WrappedResponse {
    //#endregion
    //#region Methods
    constructor(isLogicError, message, data, total, page, count) {
        super(isLogicError, message);
        this._data = data;
        this._count = count;
        this._page = page;
        this._total = total;
        this._dataType = 'Collection';
    }
    serializeSimpleObject() {
        var simpleObject = super.serializeSimpleObject();
        simpleObject.data = this.data;
        simpleObject.info.total = this.total;
        simpleObject.info.page = this.page;
        simpleObject.info.count = this.count;
        return simpleObject;
    }
    //#endregion
    //#region Accessors
    get data() { return this._data; }
    set data(value) { this._data = value; }
    get total() { return this._total; }
    set total(value) { this._total = value; }
    get count() { return this._count; }
    set count(value) { this._count = value; }
    get page() { return this._page; }
    set page(value) { this._page = value; }
}
exports.WrappedCollection = WrappedCollection;
class WrappedError {
    //#endregion
    //#region Methods
    constructor(description, error) {
        this._errorDescription = description;
        this._errorObject = error;
    }
    serializeSimpleObject() {
        return {
            errorDescription: this.errorDescription,
            errorObject: this.errorObject
        };
    }
    //#endregion
    //#region Accessors
    get errorDescription() { return this._errorDescription; }
    set errorDescription(value) { this._errorObject = value; }
    get errorObject() { return this._errorObject; }
    set errorObject(value) { this._errorObject = value; }
}
exports.WrappedError = WrappedError;
//# sourceMappingURL=hcWrapper.js.map