"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AMQPSender {
    constructor(messageContent, options) {
        if (messageContent && messageContent.sender) {
            this._actionName = messageContent.sender.actionName;
            this._entityName = messageContent.sender.entityName;
            this._serviceName = messageContent.sender.serviceName;
            this._privateUserData = messageContent.sender.privateUserData;
        }
        if (options) {
            this._publishOptions = options.publishOptions;
        }
    }
    serialize() {
        return {
            serviceName: this._serviceName,
            entityName: this._entityName,
            actionName: this._actionName,
            privateUserData: this._privateUserData
        };
    }
    //#endregion
    //#region Accessors
    get serviceName() { return this._serviceName; }
    get entityName() { return this._entityName; }
    get actionName() { return this._actionName; }
    get publishOptions() { return this._publishOptions; }
    get privateUserData() { return this._privateUserData; }
}
exports.AMQPSender = AMQPSender;
//# sourceMappingURL=AMQPSender.js.map