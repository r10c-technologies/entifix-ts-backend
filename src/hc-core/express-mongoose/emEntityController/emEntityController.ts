import mongoose = require('mongoose');
import { EMSession } from '../emSession/emSession';
import { EMEntity, EntityDocument  } from '../emEntity/emEntity';
import { EMResponseWrapper } from '../emWrapper/emWrapper';
import HttpStatus = require('http-status-codes');
import express = require('express')

class EMEntityController<TDocument extends EntityDocument, TEntity extends EMEntity>
{
    //#region Properties (Fields)

    private _entityName : string;
    private _session : EMSession;
    private _responseWrapper : EMResponseWrapper<TDocument, TEntity>;
    private _useEntities : boolean;
    
    protected _router : express.Router;
    protected _resourceName : string;
    
    //#endregion


    //#region Methods

    constructor ( entityName : string, session : EMSession)
    {
        this._entityName = entityName;
        this._session = session;
        this._useEntities = true;
        this._responseWrapper = new EMResponseWrapper();
      
        this.constructRouter();
    }

    retrieve ( request : express.Request, response : express.Response) : void
    {
        this._session.listDocuments<TDocument>(this._entityName).then(
            results => {                
                if (this._useEntities)
                    this._responseWrapper.entityCollection(response, results.map( e => this._session.activateEntityInstance<TEntity, TDocument>(this._entityName, e) ));
                else
                    this._responseWrapper.documentCollection(response, results);
            },
            error => this._responseWrapper.sessionError(response, error)
        );
    }

    retrieveById ( request : express.Request, response : express.Response ) : void
    {
        this._session.findDocument<TDocument>(this._entityName, request.params._id).then(
            result => {
                if (this.useEntities)
                    this._responseWrapper.entity(response, this._session.activateEntityInstance<TEntity, TDocument>(this._entityName, result) );
                else
                    this._responseWrapper.document(response, result )
            },
            error => this._responseWrapper.sessionError(response, error)
        );
    }

    retriveMetadata( request : express.Request, response : express.Response, next : express.NextFunction)
    {
        this._responseWrapper.object(response, this._session.getMetadataToExpose(this._entityName));
    }

    create ( request : express.Request, response : express.Response ) : void
    {
        if (!this._useEntities)
        {
            this._session.createDocument(this.entityName, <TDocument>request.body).then(
                result => this._responseWrapper.document(response, result, HttpStatus.CREATED),
                error => this._responseWrapper.sessionError(response, error)
            );
        }
        else
            this.save(request, response);
    }

    update ( request : express.Request, response : express.Response ) : void
    {
        if (!this._useEntities)
        {
            this._session.updateDocument(this._entityName, <TDocument>request.body).then(
                result => this._responseWrapper.document(response, result, HttpStatus.OK),
                error => this._responseWrapper.sessionError(response, error)
            );
        }
        else
             this.save(request, response);
    }

    delete ( request : express.Request, response : express.Response ) : void
    {
        this._session.findDocument<TDocument>(this._entityName, request.params._id).then(
            result => {
                let responseOk = () => this._responseWrapper.object( response, {'Delete status': 'register deleted '} );
                let responseError = error => this._responseWrapper.sessionError(response, responseError);

                if (this._useEntities)
                {
                    let entity = this._session.activateEntityInstance<TEntity, TDocument>(this._entityName, result);
                    entity.delete().then( responseOk, responseError);
                }
                else
                    this._session.deleteDocument(this.entityName, result).then( responseOk, responseError );        
            },
            error => this._responseWrapper.sessionError(response, error)
        
        );
    
    }

    private save( request : express.Request, response : express.Response) : void
    {
        let entity = this._session.activateEntityInstance<TEntity,TDocument>(this._entityName, <TDocument>request.body);

        entity.save().then(
            result => this._responseWrapper.entity (response, entity),
            error => this._responseWrapper.sessionError(response, error)
        );
    }

    private constructRouter() : void
    {
        this._resourceName = '/' +  this._entityName.toLowerCase();
        this._router = express.Router();
        
        this.defineRoutes();
    }

    protected defineRoutes() : void
    {
        // It is important to consider the order of the class methods setted for the HTTP Methods 
        this._router.get( this._resourceName, ( request, response, next )=> this.retrieve(request, response) );
        this._router.get( this._resourceName + '/metadata', (request, response, next) => this.retriveMetadata(request, response, next) ); 
        this._router.get( this._resourceName + '/:_id', (request, response, next) => this.retrieveById( request, response ) );
        this._router.post( this._resourceName, (request, response, next) => this.create(request, response) );
        this._router.put( this._resourceName, (request, response, next) => this.update(request, response) );
        this._router.delete( this._resourceName + '/:_id',(request, response, next) => this.delete(request, response ));
    }

    

    //#endregion


    //#region Accessors (Properties)

    get entityName ()
    { return this._entityName; }
    get session ()
    { return this. _session; }

    get useEntities ()
    { return this._useEntities; }
    set useEntities (value)
    { this._useEntities = value; }

    get router ()
    { return this._router; }

    protected get responseWrapper()
    {
        return this._responseWrapper;
    }

    //#endregion
}

export { EMEntityController }