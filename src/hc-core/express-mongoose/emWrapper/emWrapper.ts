import { Wrapper } from '../../hcWrapper/hcWrapper';
import mongoose = require('mongoose');
import express = require('express');
import { EMSessionError } from '../emSession/emSession';
import { EMEntity } from '../emEntity/emEntity';

class EMResponseWrapper<TDocument extends mongoose.Document, TEntity extends EMEntity>
{
    //#region Properties
    
    //#endregion

    //#region Methods

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

    error( response: express.Response, message: string, code: number )
    {
        response.statusCode = code;
        response.send( Wrapper.wrapError(message, null).serializeSimpleObject() );
    } 

    sessionError( response: express.Response, error : any)
    {
        response.statusCode = 500;
        if (error instanceof EMSessionError)
        {
            let e = <EMSessionError>error;
            let errorMessage : string;
            
            if (e.error)
                errorMessage = e.error.name + ' - ' + e.error.message;
            else
                errorMessage = e.message;

            response.send( Wrapper.wrapError(errorMessage, e.error).serializeSimpleObject() );   
        }
        else
            response.send( 'INTERNAL UNHANDLED ERROR');
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