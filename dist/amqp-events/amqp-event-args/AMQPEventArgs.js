"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AMQPEventArgs {
    //#endregion
    //#region Methods
    constructor(messageContent) {
        if (messageContent && messageContent.data)
            this._data = messageContent.data;
    }
    serialize() {
        return {
            data: this._data
        };
    }
    //#endregion
    //#region Accessors
    get data() { return this._data; }
    set data(value) { this._data = value; }
}
exports.AMQPEventArgs = AMQPEventArgs;
//# sourceMappingURL=AMQPEventArgs.js.map