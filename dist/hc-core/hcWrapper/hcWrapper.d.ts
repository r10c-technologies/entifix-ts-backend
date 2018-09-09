declare class Wrapper {
    constructor();
    static wrapObject<T>(isLogicError: boolean, message: string, object: T): WrappedObject<T>;
    static wrapObject<T>(isLogicError: boolean, message: string, object: T, isEntity: boolean): WrappedObject<T>;
    static wrapCollection<T>(isLogicError: boolean, message: string, objectCollection: Array<T>): WrappedCollection<T>;
    static wrapCollection<T>(isLogicError: boolean, message: string, objectCollection: Array<T>, total: number, count: number, page: number): WrappedCollection<T>;
    static wrapError(errorDescription: string): WrappedError;
    static wrapError(errorDescription: string, error: any): WrappedError;
}
declare abstract class WrappedResponse {
    private _isLogicError;
    private _message;
    protected _dataType: string;
    constructor(isLogicError: boolean, message: string);
    serializeSimpleObject(): any;
    isLogicError: boolean;
    message: string;
}
declare class WrappedObject<T> extends WrappedResponse {
    private _data;
    constructor(isLogicError: boolean, message: string, data: T);
    constructor(isLogicError: boolean, message: string, data: T, isEntity: boolean);
    serializeSimpleObject(): any;
    data: T;
}
declare class WrappedCollection<T> extends WrappedResponse {
    private _data;
    private _total;
    private _page;
    private _count;
    constructor(isLogicError: boolean, message: string, data: Array<T>, total: number, page: number, count: number);
    serializeSimpleObject(): any;
    data: T[];
    total: number;
    count: number;
    page: number;
}
declare class WrappedError {
    private _errorDescription;
    private _errorObject;
    constructor(description: string, error: any);
    serializeSimpleObject(): any;
    errorDescription: string;
    errorObject: any;
}
export { Wrapper, WrappedError, WrappedCollection, WrappedObject, WrappedResponse };
