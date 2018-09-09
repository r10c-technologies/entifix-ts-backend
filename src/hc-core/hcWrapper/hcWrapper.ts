import { error } from "util";

class Wrapper
{
    //#region Properties
    //#endregion

    //#region Methods

    constructor ()
    {

    }
    
    static wrapObject<T>(isLogicError: boolean, message : string, object : T) : WrappedObject<T>;
    static wrapObject<T>(isLogicError: boolean, message : string, object : T, isEntity : boolean ) : WrappedObject<T>;
    static wrapObject<T>(isLogicError: boolean, message : string, object : T, isEntity? : boolean) : WrappedObject<T>
    {
        return new WrappedObject(isLogicError, message, object, isEntity);
    }

    static wrapCollection<T>( isLogicError: boolean, message : string, objectCollection : Array<T>) : WrappedCollection<T>;
    static wrapCollection<T>( isLogicError: boolean, message : string, objectCollection : Array<T>, total : number, count : number, page: number ) : WrappedCollection<T>;
    static wrapCollection<T>( isLogicError: boolean, message : string, objectCollection : Array<T>, total? : number, count? : number, page? : number) : WrappedCollection<T>
    {
        objectCollection = objectCollection || [];
        total = total || objectCollection.length;
        count = count || objectCollection.length;
        page = page || 0;

        return new WrappedCollection(isLogicError, message, objectCollection, total, page, count);
    }

    static wrapError(errorDescription: string) : WrappedError;
    static wrapError(errorDescription: string, error : any) : WrappedError;
    static wrapError(errorDescription: string, error? : any) : WrappedError
    {
        return new WrappedError(errorDescription, error);
    }

    //#endregion

    //#region Accessors
    //#endregion
}


abstract class WrappedResponse
{
    //#region Properties

    private _isLogicError : boolean;
    private _message : string;

    protected _dataType : string;

    //#endregion

    //#region Methods

    constructor (isLogicError : boolean, message : string)
    {
        this._isLogicError = isLogicError;
        this._message = message;
    }
    
    serializeSimpleObject() : any
    {
        return {
            isLogicError: this.isLogicError,
            message: this.message,
            info: { type: this._dataType }
        };
    };

    //#endregion 

    //#region Accessors

    get isLogicError ()
    { return this._isLogicError; }
    set isLogicError (value)
    { this._isLogicError = value; }

    get message ()
    { return this._message; }
    set message (value)
    { this._message = value; }

    //#endregion 
}


class WrappedObject<T> extends WrappedResponse
{
   //#region Properties

   private _data : T;

   //#endregion

    //#region Methods

    constructor ( isLogicError : boolean, message : string, data : T );
    constructor ( isLogicError : boolean, message : string, data : T , isEntity : boolean);
    constructor ( isLogicError : boolean, message : string, data : T , isEntity? : boolean)
    {
        super(isLogicError, message);
        this._data = data;
        
        if (isEntity == true)
            this._dataType = 'Entity';
        else
            this._dataType = 'Object';
    }
    
    serializeSimpleObject () : any
    {
        var simpleObject = super.serializeSimpleObject();
        simpleObject.data = this.data;

        return simpleObject;
    }

    //#endregion

    //#region Accessors

    get data ()
    { return this._data; }
    set data (value)
    { this._data = value; }

    //#endregion 
}

class WrappedCollection<T> extends WrappedResponse
{
   //#region Properties

   private _data : Array<T>;
   private _total : number;
   private _page : number;
   private _count : number;

   //#endregion

    //#region Methods

    constructor ( isLogicError : boolean, message : string, data : Array<T>, total : number, page : number, count : number )
    {
        super(isLogicError, message);

        this._data = data;
        this._count = count;
        this._page = page;
        this._total = total;

        this._dataType = 'Collection';
    }
    
    serializeSimpleObject () : any
    {
        var simpleObject = super.serializeSimpleObject();
        simpleObject.data = this.data;
        simpleObject.info.total = this.total;
        simpleObject.info.page = this.page;
        simpleObject.info.count = this.count;
        
        return simpleObject
    }

    //#endregion

    //#region Accessors

    get data ()
    { return this._data; }
    set data (value)
    { this._data = value; }

    get total ()
    { return this._total; }
    set total (value)
    { this._total = value; }

    get count ()
    { return this._count; }
    set count (value)
    { this._count = value; }

    get page ()
    { return this._page; }
    set page (value)
    { this._page = value; }

    //#endregion 
}


class WrappedError
{
    //#region Properties

    private _errorDescription : string;
    private _errorObject : any;

    //#endregion

    //#region Methods

    constructor (description : string, error : any)
    {
        this._errorDescription = description;
        this._errorObject = error;
    }

    serializeSimpleObject() : any
    {
        return {
            isLogicError: null,
            message: this._errorDescription,
            info: { type: 'ERROR' },
            data: this._errorObject
        };
    };

    //#endregion

    //#region Accessors

    get errorDescription ()
    { return this._errorDescription; }
    set errorDescription (value)
    { this._errorObject = value; }

    get errorObject ()
    { return this._errorObject; }
    set errorObject (value)
    { this._errorObject = value; }

    //#endregion
}

export { 
    Wrapper, 
    WrappedError, 
    WrappedCollection, 
    WrappedObject,
    WrappedResponse
}