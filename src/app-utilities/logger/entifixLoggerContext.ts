import { EntifixLogger } from "./entifixLogger";
import { EntifixLoggerMessage } from "./entifixLoggerMessage";
import { EMSession } from "../../express-mongoose/emSession/emSession";

class EntifixLoggerContext
{

    //#region Properties

    private 

    private _fileName : string;
    private _className : string;
    private _methodName : string;
    private _session : EMSession;

    //#endregion 


    //#region Methods


    clone() : EntifixLoggerContext
    {
        return new EntifixLoggerContext()
            .setClassName(this._className)
            .setMethodName(this._methodName)
            .setFileName(this._fileName)
            .setSession(this._session);
    } 


    debug(message: string, developer: string) : void
    {
        let messageData : EntifixLoggerMessage = {
            message, developer,
            origin: { file: this._fileName, class: this._className, method: this._methodName },
            systemOwner: this._session?.privateUserData?.systemOwnerSelected, user: this._session?.privateUserData?.userName
        };

        EntifixLogger.debug(messageData);
    }


    warn(message: string, developer: string) : void
    {
        let messageData : EntifixLoggerMessage = {
            message, developer,
            origin: { file: this._fileName, class: this._className, method: this._methodName },
            systemOwner: this._session?.privateUserData?.systemOwnerSelected, user: this._session?.privateUserData?.userName
        };

        EntifixLogger.warn(messageData);
    }


    trace(message: string, developer: string) : void
    {
        let messageData : EntifixLoggerMessage = {
            message, developer,
            origin: { file: this._fileName, class: this._className, method: this._methodName },
            systemOwner: this._session?.privateUserData?.systemOwnerSelected, user: this._session?.privateUserData?.userName
        };

        EntifixLogger.trace(messageData);
    }


    error(message: string, developer: string) : void
    {
        let messageData : EntifixLoggerMessage = {
            message, developer,
            origin: { file: this._fileName, class: this._className, method: this._methodName },
            systemOwner: this._session?.privateUserData?.systemOwnerSelected, user: this._session?.privateUserData?.userName
        };

        EntifixLogger.error(messageData);
    }


    fatal(message: string, developer: string) : void
    {
        let messageData : EntifixLoggerMessage = {
            message, developer,
            origin: { file: this._fileName, class: this._className, method: this._methodName },
            systemOwner: this._session?.privateUserData?.systemOwnerSelected, user: this._session?.privateUserData?.userName
        };

        EntifixLogger.fatal(messageData);
    }


    //#endregion 


    //#region Accessors


    get fileName() 
    { return this._fileName; }
    set fileName(value)
    { this._fileName = value; }
    setFileName(value)
    { this._fileName = value; return this; }


    get className() 
    { return this._className; }
    set className(value)
    { this._className = value; }
    setClassName(value)
    { this._className = value; return this; }


    get methodName() 
    { return this._methodName; }
    set methodName(value)
    { this._methodName = value; }
    setMethodName(value)
    { this._methodName = value; return this; }


    get session() 
    { return this._session; }
    set session(value)
    { this._session = value; }
    setSession(value)
    { this._session = value; return this; }


    //#endregion 

}

export {
    EntifixLoggerContext
}