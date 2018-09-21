"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Wrapper {
    //#region Properties
    //#endregion
    //#region Methods
    constructor() {
    }
    static wrapObject(isLogicError, message, object, options) {
        return new WrappedObject(isLogicError, message, object, options);
    }
    static wrapCollection(isLogicError, message, objectCollection, options) {
        return new WrappedCollection(isLogicError, message, objectCollection, options);
    }
    static wrapError(errorDescription, error) {
        return new WrappedError(errorDescription, error);
    }
}
exports.Wrapper = Wrapper;
class WrappedResponse {
    //#endregion
    //#region Methods
    constructor(devData, isLogicError, message) {
        this._isLogicError = isLogicError;
        this._message = message;
        this._devData = devData;
    }
    serializeSimpleObject() {
        let obj = {
            isLogicError: this.isLogicError,
            message: this.message,
            info: { type: this._dataType }
        };
        if (this._devData)
            obj.devData = this._devData;
        return obj;
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
    constructor(isLogicError, message, data, options) {
        let devData = options != null ? options.devData : null;
        super(devData, isLogicError, message);
        let isEntity = options != null && options.isEntity != null ? options.isEntity : false;
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
    constructor(isLogicError, message, data, options) {
        let devData = options != null ? options.devData : null;
        super(devData, isLogicError, message);
        data = data || [];
        options = options || {};
        this._data = data;
        this._count = options.count || data.length;
        this._page = options.page || 1;
        this._total = options.total || null;
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
class WrappedError extends WrappedResponse {
    constructor(description, error, options) {
        let devData = options != null ? options.devData : null;
        super(devData, null, description);
        this._errorObject = error;
        this._dataType = 'Error';
    }
    serializeSimpleObject() {
        var simpleObject = super.serializeSimpleObject();
        simpleObject.data = this._errorObject;
        return simpleObject;
    }
    ;
    //#endregion
    //#region Accessors
    get errorObject() { return this._errorObject; }
    set errorObject(value) { this._errorObject = value; }
}
exports.WrappedError = WrappedError;
//# sourceMappingURL=hcWrapper.js.map