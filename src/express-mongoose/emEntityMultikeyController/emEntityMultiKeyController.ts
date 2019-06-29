//Dependencies
import express = require('express');
import HttpStatus = require('http-status-codes');

//Framework imports
import { EMEntityController } from '../emEntityController/emEntityController'; 
import { EMEntityMultiKey } from '../emEntityMultiKey/emEntityMultiKey';
import { EMEntity, EntityDocument  } from '../emEntity/emEntity';


class EMEntityMutltiKeyController<TDocument extends EntityDocument, TEntityMK extends EMEntityMultiKey> extends EMEntityController<TDocument, TEntityMK> 
{
    //#region Properties

    //#endregion


    //#region Methods

    protected createRoutes() : void
    {
        super.createRoutes();
        
        this._router.get( '/by-key/:service/:entity/:id', (request, response, next) => this.retrieveByKey( request, response, next ) );    
    }

    retrieveByKey( request : express.Request, response : express.Response, next : express.NextFunction ) : void
    {
        this.createSession( request, response ).then( session => { if (session) {
            let serviceName = request.params.service;
            let entityName = request.params.entity;
            let id = request.params.id;

            if ( serviceName && entityName && id )
            {                
                let key =  { serviceName, entityName, value: id };
                session.findByKey<TEntityMK, TDocument>( this.entityInfo, key).then( 
                    entity => this.responseWrapper.entity(response, entity)
                ).catch( err => this.responseWrapper.exception(response, err ) );
            }
            else
            {
                let responseWithError = messageDetails => this.responseWrapper.handledError( response, 'Incomplete request', HttpStatus.BAD_REQUEST, {  details: messageDetails } );
                if (!serviceName)
                    responseWithError('It is necessary a service name: /<ServiceName>/<Entity>/<id>');
                else if (!entityName)
                    responseWithError('It is necessary an entity name: /<ServiceName>/<Entity>/<id>');
                else if (!id)
                    responseWithError('It is necessary an id: /<ServiceName>/<Entity>/<id>');
            }
        }});
    }

    //#endregion


    //#region Accessors

    //#endregion
}

export { EMEntityMutltiKeyController }