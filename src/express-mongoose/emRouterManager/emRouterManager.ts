import express = require('express');
import mongoose = require('mongoose');
import { EMSession } from '../emSession/emSession';
import { EMEntityController } from '../emEntityController/emEntityController'; 
import { EMEntity, EntityDocument } from '../emEntity/emEntity';
import { EMResponseWrapper } from '../emWrapper/emWrapper';
import { Wrapper } from '../../hc-core/hcWrapper/hcWrapper';
import { AccessorInfo } from '../../hc-core/hcMetaData/hcMetaData';
import { EMServiceSession } from '../emServiceSession/emServiceSession';

class IExpositionDetail
{
    entityName : string;
    basePath: string;
    controller: any; // Issues with set a type for multiple generic controllers 
}

class EMRouterManager {
    
    //#regrion Properties (Fields)
    
    private _serviceSession : EMServiceSession;
    private _expressAppInstance : express.Application;
    private _routers : Array<IExpositionDetail>;

    //#endregion


    //#regrion Methods
    
    constructor (serviceSession : EMServiceSession, exrpressAppInstance : express.Application)
    {
        this._serviceSession = serviceSession;
        this._expressAppInstance = exrpressAppInstance;
        this._routers = new Array<IExpositionDetail>();
    }

    
    exposeEntity<TDocument extends EntityDocument, TEntity extends EMEntity> ( entityName : string) : void;
    exposeEntity<TDocument extends EntityDocument, TEntity extends EMEntity> ( entityName : string, options : { controller? : EMEntityController<TDocument, TEntity>, basePath? : string, resourceName? : string  } ) : void;
    exposeEntity<TDocument extends EntityDocument, TEntity extends EMEntity> ( entityName : string, options? : { controller? : EMEntityController<TDocument, TEntity>, basePath? : string, resourceName? : string  } ) : void
    {
        let basePath = options && options.basePath ? options.basePath : 'api';
        let resourceName = options && options.resourceName ? options.resourceName : null; 

        let entityController : EMEntityController<TDocument, TEntity>;
        if (options && options.controller)
            entityController = options.controller;
        else            
            entityController = new EMEntityController<TDocument, TEntity>( entityName, this, {  resourceName } );   
        
        this._routers.push( { entityName : entityName, controller : entityController, basePath } );
        this._expressAppInstance.use('/' + basePath, entityController.router);
    }

    exposeEnumeration( name: string, enumerator : any ) : void;
    exposeEnumeration( name: string, enumerator : any, options : { basePath? : string, resourceName? : string } ) : void;
    exposeEnumeration( name: string, enumerator : any, options?  : { basePath? : string, resourceName? : string } ) : void
    {
        let basePath = options && options.basePath ? options.basePath : 'api';
        let resourceName = options && options.resourceName ? options.resourceName : name.toLowerCase();
        let newController = new EMSimpleController(resourceName);

        let keys = Object.keys( enumerator );

        let arrayToExpose = new Array < { id:any, value:any }>();
        
        keys.forEach( k => { 
            if (arrayToExpose.find(pair => pair.value == k) == null)
                arrayToExpose.push({ id: k, value: enumerator[k]});
        });
        
        newController.retrieveMethod = ( req, res, next ) =>{
            res.send( Wrapper.wrapCollection(false, null, arrayToExpose).serializeSimpleObject() );
        }

        newController.retrieveByIdMethod = ( req, res, next) => {
            let id = req.params._id;
            let objectToExpose = arrayToExpose.find( v => v.id == id );
            res.send( Wrapper.wrapObject( false, null , objectToExpose).serializeSimpleObject() );
        }

        newController.createRoutes();
        this._expressAppInstance.use('/'+ basePath, newController.router);
        this._routers.push( { entityName : name, controller: newController, basePath }) ;
    }

    resolveComplexRetrieve(session : EMSession, construtorType : string, instanceId : string, expositionAccessorInfo : AccessorInfo, pathOverInstance : Array<string> ) : void
    {
        let constructionController = this.findController(construtorType);

        constructionController.findEntity(session, instanceId).then( entity => {
            
            let objectToExpose : any = entity[pathOverInstance[0]];
            
            for (let i = 1; i < pathOverInstance.length; i++)
            {
                let nexStep = pathOverInstance[i];
                if (objectToExpose instanceof Array)
                    objectToExpose = objectToExpose.find( obj => obj._id.toString() == nexStep);
                else
                    objectToExpose = objectToExpose ? objectToExpose[pathOverInstance[i]] : null;
            }
                
            let expositionType = expositionAccessorInfo.activator.entityInfo.name;           
            let expositionController = this.findController(expositionType);

            let isArray = objectToExpose ? objectToExpose instanceof Array : null;
            if (isArray == null)
                isArray = expositionAccessorInfo.type == 'Array';

            if (isArray)
                expositionController.responseWrapper.entityCollection( session.response, objectToExpose );
            else
                expositionController.responseWrapper.entity(session.response, objectToExpose);                
        });        
    }

    resolveComplexCreate(session : EMSession, construtorType : string, instanceId : string, expositionAccessorInfo : AccessorInfo, pathOverInstance : Array<string> ) : void
    {   
        let constructionController = this.findController(construtorType);
        let expositionController = this.findController(expositionAccessorInfo.activator.entityInfo.name);

        constructionController.findEntity(session, instanceId).then( baseEntity => {
            expositionController.createInstance( session.request, session.response, { alwaysNew: true } ).then( exEntity => {
                let objectToExpose : any = baseEntity[pathOverInstance[0]];
                let pathTo = pathOverInstance[0];

                for (let i = 1; i < pathOverInstance.length; i++)
                {
                    objectToExpose = objectToExpose ? objectToExpose[pathOverInstance[i]] : null;
                    pathTo = pathTo + '.' + pathOverInstance[i];
                }

                if (expositionAccessorInfo.type == 'Array')
                {
                    if (baseEntity[pathTo] == null)
                        baseEntity[pathTo] = [];

                    (baseEntity[pathTo] as Array<EMEntity>).push(exEntity);
                }                    
                else
                    baseEntity[pathTo] = exEntity;

                baseEntity.save().then( movFlow => {
                    if (movFlow.continue)
                        expositionController.responseWrapper.entity(session.response, exEntity);
                    else
                        expositionController.responseWrapper.logicError(session.response, movFlow.message);
                },
                error => expositionController.responseWrapper.exception(session.response, error ));                
            });        
        }, 
        error => expositionController.responseWrapper.exception( session.response, error ));  
    }

    resolveComplexUpdate(session : EMSession, construtorType : string, instanceId : string, expositionAccessorInfo : AccessorInfo, pathOverInstance : Array<string> ) : void
    {
        let constructionController = this.findController(construtorType);
        let expositionController = this.findController(expositionAccessorInfo.activator.entityInfo.name);

        constructionController.findEntity(session, instanceId).then( baseEntity => {
            expositionController.createInstance( session.request, session.response, { alwaysNew: true } ).then( exEntity => {
                let objectToExpose : any = baseEntity[pathOverInstance[0]];
                let pathTo = pathOverInstance[0];

                for (let i = 1; i < pathOverInstance.length; i++)
                {
                    objectToExpose = objectToExpose ? objectToExpose[pathOverInstance[i]] : null;
                    pathTo = pathTo + '.' + pathOverInstance[i];
                }

                if (expositionAccessorInfo.type == 'Array')
                {
                     let index = (baseEntity[pathTo] as Array<EMEntity>).findIndex( e => e._id == exEntity._id );
                     (baseEntity[pathTo] as Array<EMEntity>).splice(index, 1);
                     (baseEntity[pathTo] as Array<EMEntity>).push(exEntity);
                }                    
                else
                    baseEntity[pathTo] = exEntity;

                baseEntity.save().then( movFlow => {
                    if (movFlow.continue)
                        expositionController.responseWrapper.entity( session.response, exEntity);
                    else
                        expositionController.responseWrapper.logicError( session.response, movFlow.message);
                },
                error => expositionController.responseWrapper.exception( session.response, error ));                
            });        
        }, 
        error => expositionController.responseWrapper.exception( session.response, error ));
    }

    resolveComplexDelete(session : EMSession, construtorType : string, instanceId : string, expositionAccessorInfo : AccessorInfo, pathOverInstance : Array<string> ) : void
    {
        let constructionController = this.findController(construtorType);
        let expositionController = this.findController(expositionAccessorInfo.activator.entityInfo.name);

        constructionController.findEntity(session, instanceId).then( baseEntity => {
            expositionController.createInstance( session.request, session.response, { alwaysNew: true } ).then( exEntity => {
                let objectToExpose : any = baseEntity[pathOverInstance[0]];
                let pathTo = pathOverInstance[0];

                for (let i = 1; i < pathOverInstance.length; i++)
                {
                    objectToExpose = objectToExpose[pathOverInstance[i]];
                    pathTo = pathTo + '.' + pathOverInstance[i];
                }

                if (expositionAccessorInfo.type == 'Array')
                {
                     let index = (baseEntity[pathTo] as Array<EMEntity>).findIndex( e => e._id == exEntity._id );
                     (baseEntity[pathTo] as Array<EMEntity>).splice(index, 1);
                }                    
                else
                    baseEntity[pathTo] = exEntity;

                baseEntity.save().then( movFlow => {
                    if (movFlow.continue)
                        expositionController.responseWrapper.entity(session.response, exEntity);
                    else
                        expositionController.responseWrapper.logicError( session.response, movFlow.message);
                },
                error => expositionController.responseWrapper.exception( session.response, error ));                
            });        
        }, 
        error => expositionController.responseWrapper.exception( session.response, error ));
    }
    
    getExpositionDetails() : Array<{ entityName : string, resourceName : string, basePath : string }> 
    {
        return this._routers.map( r => { return { entityName: r.entityName, resourceName: r.controller.resourceName, basePath: r.basePath} } );
    }

    findController<TEntity extends EMEntity, TDocument extends EntityDocument>( entityName : string ) : EMEntityController<TDocument, TEntity>
    {
        return this._routers.find( ed => ed.entityName == entityName).controller;
    }

    //#endregion


    //#regrion Accessors (Properties)
    
    get serviceSession () : EMServiceSession
    {
        return this._serviceSession;
    }

    get expressAppInstance () : express.Application
    {
        return this._expressAppInstance;
    }

    //#endregion

}

class EMSimpleController 
{
    //#region Properties

    private _retrieveMethod : ( request : express.Request, response : express.Response, next : express.NextFunction ) => void;
    private _retrieveByIdMethod : ( request : express.Request, response : express.Response, next : express.NextFunction ) => void;
    private _createMethod : ( request : express.Request, response : express.Response, next : express.NextFunction ) => void;
    private _updateMethod : ( request : express.Request, response : express.Response, next : express.NextFunction ) => void;
    private _deleteMethod : ( request : express.Request, response : express.Response, next : express.NextFunction ) => void;
    
    private _router : express.Router;
    
    private _resourceName : string;
    //#endregion

    //#region Methods

    constructor( resourceName )
    {
        this._resourceName = resourceName;
    }

    createRoutes( ) : void
    {
        this._router = express.Router();

        if (this._retrieveByIdMethod)
            this._router.get('/' + this._resourceName + '/:_id', (request, response, next) => this._retrieveByIdMethod(request, response, next ) );
        
        if (this._retrieveMethod)
            this._router.get('/' + this._resourceName, (request, response, next) => this._retrieveMethod(request, response, next ) );
        
        if (this._createMethod)
            this._router.post('/' + this._resourceName, (request, response, next) => this._createMethod(request, response, next ) );
        
        if (this._updateMethod)
            this._router.put('/' + this._resourceName, (request, response, next) => this._updateMethod(request, response, next ) );
        
        if (this._deleteMethod)
            this._router.delete('/' + this._resourceName + '/:_id' , (request, response, next) => this._deleteMethod(request, response, next ) );

    }

    //#endregion

    //#region Accessors

    get router()
    { return this._router; }

    get retrieveMethod( ) : ( request : express.Request, response : express.Response, next : express.NextFunction ) => void
    { return this._retrieveMethod; }
    set retrieveMethod ( value ) 
    { this._retrieveMethod = value; }

    get retrieveByIdMethod( ) : ( request : express.Request, response : express.Response, next : express.NextFunction ) => void
    { return this._retrieveByIdMethod }
    set retrieveByIdMethod( value ) 
    { this._retrieveByIdMethod = value; }

    get createMethod( ) : ( request : express.Request, response : express.Response, next : express.NextFunction ) => void
    { return this._createMethod; }
    set createMethod( value ) 
    { this._createMethod = value; }

    get updateMethod( ) : ( request : express.Request, response : express.Response, next : express.NextFunction ) => void
    { return this._updateMethod; }
    set updateMethod( value ) 
    { this._updateMethod = value; }

    get deleteMethod( ) : ( request : express.Request, response : express.Response, next : express.NextFunction ) => void
    { return this._deleteMethod; }
    set deleteMethod( value ) 
    { this._deleteMethod = value; }

    //#endregion
}

export { EMRouterManager, EMSimpleController }