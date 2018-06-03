
class EMQueryWrapper
{
    //#region Properties (Fields)
    
    private _isError: boolean;
    private _message: string;
    private _resultData: any;
    
    //#endregion
    
    
    //#region Methods
    
    constructor (isError: boolean, message: string, resultData: any)
    {
        this._isError = isError;
        this._message = message;
        this._resultData = resultData;
    }
    
    //#endregion


    //#region Accessors (Properties)
    
    get isError() : boolean
    {   return this._isError; }
    set isError(value)
    {   this._isError = value; }
    
    get message() : string
    {   return this._message; }
    set message(value)
    {   this._message = value; }
    
    get resultData() : any
    {   return this._resultData; }
    set resultData(value)
    {   this._resultData = value; }
    
    //#endregion
    
}

export { EMQueryWrapper }