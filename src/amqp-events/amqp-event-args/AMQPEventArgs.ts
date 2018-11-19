
class AMQPEventArgs 
{
    //#region Properties

    protected _data : any;

    //#endregion

    //#region Methods

    constructor( messageContent : any)
    {
        if (messageContent && messageContent.data)
            this._data = messageContent.data;
    }
    
    serialize() : any
    {
        return {
            data: this._data
        };
    }

    //#endregion

    //#region Accessors

    get data ()
    { return this._data; }
    set data ( value )
    { this._data = value; }

    //#endregion

}


export { AMQPEventArgs }


