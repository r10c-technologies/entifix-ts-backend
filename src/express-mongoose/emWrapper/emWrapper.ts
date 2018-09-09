import mongoose = require('mongoose');
import express = require('express');

import { Wrapper } from '../../hc-core/hcWrapper/hcWrapper';
import { EMSessionError } from '../emSession/emSession';
import { EMEntity } from '../emEntity/emEntity';
import { EMSession } from '../emSession/emSession';

class EMResponseWrapper<TDocument extends mongoose.Document, TEntity extends EMEntity>
{
    //#region Properties
    
    //#endregion

    //#region Methods

    constructor( private session : EMSession)
    {

    }

    object( response : express.Response, object : any);
    object( response : express.Response, object : any, status : number);
    object( response : express.Response, object : any, status? : number)
    {
        response.statusCode = status || 200;
        response.send( Wrapper.wrapObject(false, null, object).serializeSimpleObject() );
    }
    
    document( response : express.Response, document : TDocument);
    document( response : express.Response, document : TDocument, status : number);
    document( response : express.Response, document : TDocument, status? : number)
    {
        response.statusCode = status || 200;
        response.send( Wrapper.wrapObject(false, null, document, true).serializeSimpleObject() );
    }

    entity( response : express.Response, entity : TEntity);
    entity( response : express.Response, entity : TEntity, status : number);
    entity( response : express.Response, entity : TEntity, status? : number)
    {
        response.statusCode = status || 200;
        response.send( Wrapper.wrapObject(false, null, entity.serializeExposedAccessors(), true ).serializeSimpleObject() );
    }

    documentCollection( response : express.Response, documents : Array<TDocument>);
    documentCollection( response : express.Response, documents : Array<TDocument>, status : number);
    documentCollection( response : express.Response, documents : Array<TDocument>, status? : number)
    {
        response.statusCode = status || 200;
        response.send( Wrapper.wrapCollection(false, null, documents).serializeSimpleObject() );
    }

    entityCollection( response : express.Response, entities : Array<TEntity>);
    entityCollection( response : express.Response, entities : Array<TEntity>, status : number);
    entityCollection( response : express.Response, entities : Array<TEntity>, status? : number)
    {
        response.statusCode = status || 200;
        response.send( Wrapper.wrapCollection(false, null, entities.map(a => a.serializeExposedAccessors()) ).serializeSimpleObject() );
    }

    error( response: express.Response, error : any, options? : { code?: number })
    {
        response.statusCode = options && options.code ? options.code : 500;
        if (error instanceof EMSessionError)
        {
            let e = <EMSessionError>error;

            let data : any;
            if (this.session.isDevMode)
            {
                data = { serviceStatus: 'Developer mode is enabled.', helper: "The error was ocurred in the Service's Session"};
                if (error)
                {
                    data.errorDetails = { sessionMessage: e.message };
                    if (e.error)
                    {
                        data.errorDetails.sessionError = { 
                            type: typeof e.error,
                            asString: e.error.toString != null ? e.error.toString() : null,
                            serialized: JSON.stringify(e.error),
                            message: e.error.message,
                            stack: e.error.stack
                        } 
                    }
                }
                    
            }                

            response.send( Wrapper.wrapError( 'INTERNAL UNHANDLED ERROR', e.error).serializeSimpleObject() );   
        }
        else
        {
            let data : any;
            if (this.session.isDevMode)
            {
                data = { serviceStatus: 'Developer mode is enabled.', helper: "The error was not ocurred in the Service's Session. The details were attached"};
                if (error)
                    data.errorDetails = { 
                        type: typeof error,
                        asString: error.toString != null ? error.toString() : null,
                        serialized: JSON.stringify(error),
                        message: error.message,
                        stack: error.stack
                    };
            }                

            response.send( Wrapper.wrapError( 'INTERNAL UNHANDLED ERROR', data).serializeSimpleObject() );
        }
    }

    logicError ( response: express.Response, message: string);
    logicError ( response: express.Response, message: string, errorDetails : any);
    logicError ( response: express.Response, message: string, errorDetails? : any)
    {
        response.send( Wrapper.wrapObject<any>(true, message, errorDetails != null ? errorDetails : {}).serializeSimpleObject() );   
    }

    logicAccept ( response: express.Response, message: string);
    logicAccept ( response: express.Response, message: string, details : any);
    logicAccept ( response: express.Response, message: string, details? : any)
    {
        response.send( Wrapper.wrapObject<any>(false, message, details != null ? details : {}).serializeSimpleObject() );   
    }

    

    //#endregion

    //#region Accessors

    //#endregion
}

export { EMResponseWrapper }