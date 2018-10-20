import mongoose = require('mongoose');
import express = require('express');

import { Wrapper } from '../../hc-core/hcWrapper/hcWrapper';
import { EMSessionError } from '../emSession/emSession';
import { EMEntity } from '../emEntity/emEntity';
import { EMSession } from '../emSession/emSession';
import HttpStatus = require('http-status-codes');

class EMResponseWrapper<TDocument extends mongoose.Document, TEntity extends EMEntity>
{
    //#region Properties

    private _session : EMSession;

    //#endregion

    //#region Methods

    constructor( session : EMSession)
    {
        this._session = session;
    }

    object( response : express.Response, object : any);
    object( response : express.Response, object : any, options: { devData? : any , status? : number });
    object( response : express.Response, object : any, options?: { devData? : any , status? : number })
    {
        let devData = options != null ? options.devData : null;

        response.statusCode = options != null && options.status != null ? options.status : HttpStatus.OK;
        response.send( Wrapper.wrapObject(false, null, object, { devData }).serializeSimpleObject() );
    }
    
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
        let serializedEntity = entity ? entity.serializeExposedAccessors() : {};
        response.send( Wrapper.wrapObject(false, null, serializedEntity, { isEntity: true, devData } ).serializeSimpleObject() );
    }

    documentCollection( response : express.Response, documents : Array<TDocument>);
    documentCollection( response : express.Response, documents : Array<TDocument>, options : { devData? : any });
    documentCollection( response : express.Response, documents : Array<TDocument>, options? : { devData? : any })
    {
        let devData = options != null ? options.devData : null;
        response.send( Wrapper.wrapCollection(false, null, documents, { devData }).serializeSimpleObject() );
    }

    entityCollection( response : express.Response, entities : Array<TEntity>);
    entityCollection( response : express.Response, entities : Array<TEntity>, options : { devData? : any });
    entityCollection( response : express.Response, entities : Array<TEntity>, options? : { devData? : any } )
    {
        let devData = options != null ? options.devData : null;
        let serializedEntities = entities ? entities.map(a => a.serializeExposedAccessors()) : [];
        response.send( Wrapper.wrapCollection(false, null, serializedEntities, { devData } ).serializeSimpleObject() );
    }

    exception( response: express.Response, error : any)
    {
        response.statusCode = 500;
        if (error instanceof EMSessionError)
        {
            let e = <EMSessionError>error;

            let data : any;
            if (this._session.isDevMode)
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

            response.send( Wrapper.wrapError( 'INTERNAL UNHANDLED EXCEPTION', data).serializeSimpleObject() );   
        }
        else
        {
            let data : any;
            if (this._session.isDevMode)
            {
                data = { serviceStatus: 'Developer mode is enabled.', helper: "The error was not ocurred in a known context. The details were attached"};
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

export { EMResponseWrapper }