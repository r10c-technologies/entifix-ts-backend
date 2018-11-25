"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AMQPSender {
    //#endregion
    //#region Methods
    constructor(messageContent) {
        if (messageContent && messageContent.sender) {
            this._actionName = messageContent.sender.actionName;
            this._entityName = messageContent.sender.entityName;
            this._serviceName = messageContent.sender.serviceName;
        }
    }
    serialize() {
        return {
            serviceName: this._serviceName,
            entityName: this._entityName,
            actionName: this._actionName
        };
    }
    //#endregion
    //#region Accessors
    get serviceName() { return this._serviceName; }
    set serviceName(value) { this._serviceName = value; }
    get entityName() { return this._entityName; }
    set entityName(value) { this._entityName = value; }
    get actionName() { return this._actionName; }
    set actionName(value) { this._actionName = value; }
    get publishOptions() { return this._publishOptions; }
    set publishOptions(value) { this._publishOptions = value; }
}
exports.AMQPSender = AMQPSender;
//# sourceMappingURL=AMQPSender.js.map