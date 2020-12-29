
class Wrapper
{
    //#region Properties
    //#endregion

    //#region Methods

    constructor ()
    {

    }
    
    static wrapObject<T>(isLogicError: boolean, message : string, object : T) : WrappedObject<T>;
    static wrapObject<T>(isLogicError: boolean, message : string, object : T, options : {  isEntity? : boolean, devData? : any } ) : WrappedObject<T>;
    static wrapObject<T>(isLogicError: boolean, message : string, object : T, options? : {  isEntity? : boolean, devData? : any }) : WrappedObject<T>
    {
        return new WrappedObject(isLogicError, message, object, options);
    }

    static wrapCollection<T>( isLogicError: boolean, message : string, objectCollection : Array<T>) : WrappedCollection<T>;
    static wrapCollection<T>( isLogicError: boolean, message : string, objectCollection : Array<T>, options : {total? : number, page? : number, count? : number, devData? : any, take? : number } ) : WrappedCollection<T>;
    static wrapCollection<T>( isLogicError: boolean, message : string, objectCollection : Array<T>, options? : {total? : number, page? : number, count? : number, devData? : any, take? : number }) : WrappedCollection<T>
    {
        return new WrappedCollection(isLogicError, message, objectCollection, options);
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

    private _devData : any;

    //#endregion

    //#region Methods

    constructor (devData: any, isLogicError : boolean, message : string)
    {
        this._isLogicError = isLogicError;
        this._message = message;
        this._devData = devData;
    }
    
    serializeSimpleObject() : any
    {
        let obj : any= {
            isLogicError: this.isLogicError,
            message: this.message,
            info: { type: this._dataType }
        };

        if (this._devData)
            obj.devData = this._devData;

        return obj;
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
    constructor ( isLogicError : boolean, message : string, data : T , options : {  isEntity? : boolean, devData? : any });
    constructor ( isLogicError : boolean, message : string, data : T , options? : {  isEntity? : boolean, devData? : any })
    {
        let devData = options != null ? options.devData : null;
        super(devData, isLogicError, message);
        
        let isEntity = options != null && options.isEntity != null ? options.isEntity : false;

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
   private _take : number;

   //#endregion

    //#region Methods

    constructor ( isLogicError : boolean, message : string, data : Array<T> );
    constructor ( isLogicError : boolean, message : string, data : Array<T>, options : {total? : number, page? : number, count? : number, devData? : any, take? : number } );
    constructor ( isLogicError : boolean, message : string, data : Array<T>, options? : {total? : number, page? : number, count? : number, devData? : any, take? : number } )
    {
        let devData = options != null ? options.devData : null;
        super(devData, isLogicError, message);

        data = data || [];
        options = options || {};
        this._data = data;
        this._count = options.count || data.length;
        this._page = options.page || 1;
        this._total = options.total || null;
        this._take = options.take || null;
        this._dataType = 'Collection';
    }
    
    serializeSimpleObject () : any
    {
        var simpleObject = super.serializeSimpleObject();
        simpleObject.data = this.data;
        simpleObject.info.total = this.total;
        simpleObject.info.page = this.page;
        simpleObject.info.count = this.count;
        simpleObject.info.take = this.take;

        if (simpleObject.data && Object.keys(simpleObject.data).length === 0 && simpleObject.data.constructor === Object)
            simpleObject.data = null;

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

    get take ()
    { return this._take; }
    set take (value)
    { this._take = value; }


    //#endregion 
}


class WrappedError extends WrappedResponse
{
    //#region Properties

    private _errorObject : any;

    //#endregion

    //#region Methods

    constructor ( description : string, error : any );
    constructor ( description : string, error : any, options : { devData? : any });
    constructor ( description : string, error : any, options? : { devData? : any })
    {
    
        let devData = options != null ? options.devData : null;
        super(devData, null, description);

        this._errorObject = error;
        this._dataType = 'Error';
    }
    
    serializeSimpleObject() : any
    {
        var simpleObject = super.serializeSimpleObject();
        simpleObject.data = this._errorObject;
        
        return simpleObject;
    };

    //#endregion

    //#region Accessors

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