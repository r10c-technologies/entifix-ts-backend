declare class Wrapper {
    constructor();
    static wrapObject<T>(isLogicError: boolean, message: string, object: T): WrappedObject<T>;
    static wrapObject<T>(isLogicError: boolean, message: string, object: T, options: {
        isEntity?: boolean;
        devData?: any;
    }): WrappedObject<T>;
    static wrapCollection<T>(isLogicError: boolean, message: string, objectCollection: Array<T>): WrappedCollection<T>;
    static wrapCollection<T>(isLogicError: boolean, message: string, objectCollection: Array<T>, options: {
        total?: number;
        page?: number;
        count?: number;
        devData?: any;
        take?: number;
    }): WrappedCollection<T>;
    static wrapError(errorDescription: string): WrappedError;
    static wrapError(errorDescription: string, error: any): WrappedError;
}
declare abstract class WrappedResponse {
    private _isLogicError;
    private _message;
    protected _dataType: string;
    private _devData;
    constructor(devData: any, isLogicError: boolean, message: string);
    serializeSimpleObject(): any;
    isLogicError: boolean;
    message: string;
}
declare class WrappedObject<T> extends WrappedResponse {
    private _data;
    constructor(isLogicError: boolean, message: string, data: T);
    constructor(isLogicError: boolean, message: string, data: T, options: {
        isEntity?: boolean;
        devData?: any;
    });
    serializeSimpleObject(): any;
    data: T;
}
declare class WrappedCollection<T> extends WrappedResponse {
    private _data;
    private _total;
    private _page;
    private _count;
    private _take;
    constructor(isLogicError: boolean, message: string, data: Array<T>);
    constructor(isLogicError: boolean, message: string, data: Array<T>, options: {
        total?: number;
        page?: number;
        count?: number;
        devData?: any;
        take?: number;
    });
    serializeSimpleObject(): any;
    data: T[];
    total: number;
    count: number;
    page: number;
    take: number;
}
declare class WrappedError extends WrappedResponse {
    private _errorObject;
    constructor(description: string, error: any);
    constructor(description: string, error: any, options: {
        devData?: any;
    });
    serializeSimpleObject(): any;
    errorObject: any;
}
export { Wrapper, WrappedError, WrappedCollection, WrappedObject, WrappedResponse };
