declare class EMQueryWrapper {
    private _isError;
    private _message;
    private _resultData;
    constructor(isError: boolean, message: string, resultData: any);
    isError: boolean;
    message: string;
    resultData: any;
}
export { EMQueryWrapper };
