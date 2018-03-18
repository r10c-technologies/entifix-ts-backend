import { Wrapper } from '../hcWrapper';
import mongoose = require('mongoose');
import express = require('express');
import { EMSessionError } from './emSession';
import { EMEntity } from './emEntity';

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
        response.send( Wrapper.wrapObject(false, null, object) );
    }
    
    document( response : express.Response, document : TDocument);
    document( response : express.Response, document : TDocument, status : number);
    document( response : express.Response, document : TDocument, status? : number)
    {
        response.statusCode = status || 200;
        response.send( Wrapper.wrapObject(false, null, document) );
    }

    entity( response : express.Response, entity : TEntity);
    entity( response : express.Response, entity : TEntity, status : number);
    entity( response : express.Response, entity : TEntity, status? : number)
    {
        response.statusCode = status || 200;
        response.send( Wrapper.wrapObject(false, null, entity.serializeExposedAccessors() ));
    }

    documentCollection( response : express.Response, documents : Array<TDocument>);
    documentCollection( response : express.Response, documents : Array<TDocument>, status : number);
    documentCollection( response : express.Response, documents : Array<TDocument>, status? : number)
    {
        response.statusCode = status || 200;
        response.send( Wrapper.wrapCollection(false, null, documents));
    }

    entityCollection( response : express.Response, entities : Array<TEntity>);
    entityCollection( response : express.Response, entities : Array<TEntity>, status : number);
    entityCollection( response : express.Response, entities : Array<TEntity>, status? : number)
    {
        response.statusCode = status || 200;
        response.send( Wrapper.wrapCollection(false, null, entities.map(a => a.serializeExposedAccessors()) ) );
    }


    sessionError( response: express.Response, error : any)
    {
        response.statusCode = 500;
        if (error instanceof EMSessionError)
        {
            let e = <EMSessionError>error;
            response.send( Wrapper.wrapError(e.message, e.error) )   
        }
        else
            response.send('INTERNAL UNHANDLED ERROR');
    }

    logicError ( response: express.Response, message: string);
    logicError ( response: express.Response, message: string, errorDetails : any);
    logicError ( response: express.Response, message: string, errorDetails? : any)
    {
        response.send( Wrapper.wrapObject<any>(true, message, errorDetails != null ? errorDetails : {}) );   
    }

    logicAccept ( response: express.Response, message: string);
    logicAccept ( response: express.Response, message: string, details : any);
    logicAccept ( response: express.Response, message: string, details? : any)
    {
        response.send( Wrapper.wrapObject<any>(false, message, details != null ? details : {}) );   
    }

    

    //#endregion

    //#region Accessors

    //#endregion
}

export { EMResponseWrapper }