"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emSession_1 = require("../../express-mongoose/emSession/emSession");
class AMQPEventArgs {
    constructor(messageContent, options) {
        if (messageContent && messageContent.eventArgs)
            this._data = messageContent.eventArgs.data;
        if (messageContent && messageContent.sender && messageContent.sender.privateUserData && options && options.serviceSession)
            this._session = new emSession_1.EMSession(options.serviceSession, { privateUserData: messageContent.sender.privateUserData });
        if (options) {
            this._channel = options.channel;
            this._originalMessage = options.originalMessage;
        }
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
    get originalMessage() { return this._originalMessage; }
    get channel() { return this._channel; }
    get session() { return this._session; }
}
exports.AMQPEventArgs = AMQPEventArgs;
//# sourceMappingURL=AMQPEventArgs.js.map