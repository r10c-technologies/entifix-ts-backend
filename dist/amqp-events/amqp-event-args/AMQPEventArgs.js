"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AMQPEventArgs {
    //#endregion
    //#region Methods
    constructor(messageContent) {
        if (messageContent && messageContent.eventArgs)
            this._data = messageContent.eventArgs.data;
    }
    serialize() {
        return {
            data: this._data
        };
    }
    ackMessage() {
        if (this.channel && this._originalMessage)
            this._channel.ack(this._originalMessage);
    }
    //#endregion
    //#region Accessors
    get data() { return this._data; }
    set data(value) { this._data = value; }
    get originalMessage() { return this._originalMessage; }
    set originalMessage(value) { this._originalMessage = value; }
    get channel() { return this._channel; }
    set channel(value) { this._channel = value; }
}
exports.AMQPEventArgs = AMQPEventArgs;
//# sourceMappingURL=AMQPEventArgs.js.map