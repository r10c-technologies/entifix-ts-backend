import amqp = require('amqplib/callback_api');

import { PrivateUserData } from '../../hc-core/hcUtilities/interactionDataModels';

class AMQPSender
{
    //#region Properties

    private _serviceName : string;
    private _entityName : string;
    private _actionName : string;
    private _privateUserData : PrivateUserData;

    private _publishOptions : amqp.Options.Publish;

    //#endregion

    //#region Methods

    constructor ( messageContent : any);
    constructor ( messageContent : any, options : { publishOptions? : amqp.Options.Publish });
    constructor ( messageContent : any, options? : { publishOptions? : amqp.Options.Publish })
    {
        if (messageContent && messageContent.sender)
        {
            this._actionName = messageContent.sender.actionName;
            this._entityName = messageContent.sender.entityName;
            this._serviceName = messageContent.sender.serviceName;
            this._privateUserData = messageContent.sender.privateUserData;
        }

        if (options)
        {
            this._publishOptions = options.publishOptions;
        }
    }
    
    serialize() : any
    {
        return { 
            serviceName: this._serviceName,
            entityName: this._entityName,
            actionName: this._actionName,
            privateUserData: this._privateUserData
        };
    }

    //#endregion

    //#region Accessors

    get serviceName ()
    { return this._serviceName; }
    
    get entityName ()
    { return this._entityName; }
    
    get actionName ()
    { return this._actionName; }
    
    get publishOptions()
    { return this._publishOptions; }
    
    get privateUserData()
    { return this._privateUserData; }

    //#endregion

}


export { AMQPSender }


