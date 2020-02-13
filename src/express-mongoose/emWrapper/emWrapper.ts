import mongoose = require('mongoose');
import express = require('express');

import { Wrapper } from '../../hc-core/hcWrapper/hcWrapper';
import { EMEntity } from '../emEntity/emEntity';
import { EMServiceSession, EMSessionError } from '../emServiceSession/emServiceSession';
import HttpStatus = require('http-status-codes');


class EMResponseWrapper 
{
    //#region Properties

    private _serviceSession : EMServiceSession;

    //#endregion

    //#region Methods

    constructor( serviceSession : EMServiceSession )
    {
        this._serviceSession = serviceSession;
    }

    object( response : express.Response, object : any);
    object( response : express.Response, object : any, options: { devData? : any , status? : number });
    object( response : express.Response, object : any, options?: { devData? : any , status? : number })
    {
        let devData = options != null ? options.devData : null;

        response.statusCode = options != null && options.status != null ? options.status : HttpStatus.OK;
        response.send( Wrapper.wrapObject(false, null, object, { devData }).serializeSimpleObject() );
    }

    file( response : express.Response, file : any);
    file( response : express.Response, file : any, options: { devData? : any , status? : number });
    file( response : express.Response, file : any, options?: { devData? : any , status? : number })
    {
        let devData = options != null ? options.devData : null;

        response.statusCode = options != null && options.status != null ? options.status : HttpStatus.OK;
        response.send(file);
    }
    
    collection( response : express.Response, collection : Array<any>);
    collection( response : express.Response, collection : Array<any>, options : { devData? : any, total?: number, skip?: number, take? : number } );
    collection( response : express.Response, collection : Array<any>, options? : { devData? : any, total?: number, skip?: number, take? : number } )
    {
        let devData = options != null ? options.devData : null;
        let count = collection ? collection.length : 0;
        let total = options && options.total ? options.total : count;
        let take = options && options.take ? options.take : count;

        let page : number;
        if (take > 0)
            page = Math.trunc(total / take) + 1;
        else
            page = 1;

        response.send( Wrapper.wrapCollection(false, null, collection, { devData, total, page, count, take }).serializeSimpleObject() );
    }

    exception( response: express.Response, error : any)
    {
        response.statusCode = 500;
        if (error instanceof EMSessionError)
        {
            let e = <EMSessionError>error;

            if (e.isHandled)
            {
                response.statusCode = e.code;
                
                let errorData : any = e.error || {};

                if (!errorData.serviceStatus)
                    errorData.serviceStatus = 'Developer mode is enabled.';
                
                if (!errorData.helper)
                    errorData.helper = "The error did not occur on the Service's Session";
                
                response.send( Wrapper.wrapError( e.message.toUpperCase() , errorData).serializeSimpleObject() );
            }
            else
            {
                let data : any;
                if (this._serviceSession.isDevMode)
                {
                    data = { serviceStatus: 'Developer mode is enabled.', helper: "The error did not occur on the Service's Session"};
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
                response.send( Wrapper.wrapError( 'INTERNAL UNHANDLED EXCEPTION', data).serializeSimpleObject() );
            }   
        }
        else
        {
            let data : any;
            if (this._serviceSession.isDevMode)
            {
                data = { serviceStatus: 'Developer mode is enabled.', helper: "The error did not occur in a known context. The details were attached"};
                if (error)
                    data.errorDetails = { 
                        type: typeof error,
                        asString: error.toString != null ? error.toString() : null,
                        serialized: JSON.stringify(error),
                        message: error.message,
                        stack: error.stack
                    };
            }                

            response.send( Wrapper.wrapError( 'INTERNAL UNHANDLED EXCEPTION', data).serializeSimpleObject() );
        }
    }

    handledError( response : express.Response, message : string, status : number ) : void;
    handledError( response : express.Response, message : string, status : number, errorDetails : any ) : void;
    handledError( response : express.Response, message : string, status : number, errorDetails? : any ) : void
    {
        response.statusCode = status;
        response.send( Wrapper.wrapError( message.toUpperCase(), errorDetails ).serializeSimpleObject() );    
    }

    logicError ( response: express.Response, message: string ) : void;
    logicError ( response: express.Response, message: string, options : { errorDetails? : any, devData? : any }) : void;
    logicError ( response: express.Response, message: string, options? : { errorDetails? : any, devData? : any }) :void
    {
        let errorDetails = options != null ? options.errorDetails : null;
        let devData = options != null ? options.devData : null;

        response.send( Wrapper.wrapObject<any>(true, message, errorDetails, { devData }).serializeSimpleObject() );   
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


class EMResponseEntityWrapper<TDocument extends mongoose.Document, TEntity extends EMEntity> extends EMResponseWrapper
{
    document( response : express.Response, document : TDocument) : void;
    document( response : express.Response, document : TDocument, options : { devData? : any, status? : number }) : void;
    document( response : express.Response, document : TDocument, options? : { devData? : any, status? : number  }) : void
    {
        let devData = options != null ? options.devData : null;
        response.send( Wrapper.wrapObject(false, null, document, { isEntity: false, devData }).serializeSimpleObject() );
    }

    entity( response : express.Response, entity : TEntity) : void;
    entity( response : express.Response, entity : TEntity, options : { devData? : any }) : void;
    entity( response : express.Response, entity : TEntity, options? : { devData? : any })
    {
        let devData = options != null ? options.devData : null;
        let serializedEntity = entity && entity.serializeExposedAccessors ? entity.serializeExposedAccessors() : undefined;
        if (serializedEntity)
            response.send(Wrapper.wrapObject(false, null, serializedEntity ? serializedEntity : entity, { isEntity: true, devData } ).serializeSimpleObject());
        else
            response.send(Wrapper.wrapObject(false, null, entity, { isEntity: true, devData } ).serializeSimpleObject());
    }

    documentCollection( response : express.Response, documents : Array<TDocument>);
    documentCollection( response : express.Response, documents : Array<TDocument>, options : { devData? : any, total?: number, skip?: number, take? : number } );
    documentCollection( response : express.Response, documents : Array<TDocument>, options? : { devData? : any, total?: number, skip?: number, take? : number } )
    {
        let devData = options != null ? options.devData : null;
        let count = documents ? documents.length : 0;
        let total = options && options.total ? options.total : count;
        let take = options && options.take ? options.take : count;

        let page : number;
        if (take > 0)
            page = Math.trunc(total / take) + 1;
        else
            page = 1;

        response.send( Wrapper.wrapCollection(false, null, documents, { devData, total, page, count, take }).serializeSimpleObject() );
    }

    entityCollection( response : express.Response, entities : Array<TEntity>);
    entityCollection( response : express.Response, entities : Array<TEntity>, options : { devData? : any, total?: number, skip?: number, take? : number } );
    entityCollection( response : express.Response, entities : Array<TEntity>, options? : { devData? : any, total?: number, skip?: number, take? : number } )
    {
        let devData = options != null ? options.devData : null;
        let count = entities ? entities.length : 0;
        let total = options && options.total ? options.total : count;
        let take = options && options.take ? options.take : count;
        let page : number;

        if (take > 0)
            page = Math.trunc(total / take) + 1;
        else
            page = 1;

        let serializedEntities = entities ? entities.map(a => a.serializeExposedAccessors()) : [];
        
        response.send( Wrapper.wrapCollection(false, null, serializedEntities, { devData, total, page, count, take } ).serializeSimpleObject() );
    }
}

export { EMResponseWrapper, EMResponseEntityWrapper }