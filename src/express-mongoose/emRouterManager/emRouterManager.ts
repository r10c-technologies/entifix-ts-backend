import express = require('express');
import mongoose = require('mongoose');
import { EMSession } from '../emSession/emSession';
import { EMEntityController } from '../emEntityController/emEntityController'; 
import { EMEntity, EntityDocument } from '../emEntity/emEntity';

class IExpositionDetail
{
    entityName : string;
    basePath: string;
    controller: any; // Issues with set a type for multiple generic controllers 
}

class EMRouterManager {
    
    //#regrion Properties (Fields)
    
    private _session : EMSession;
    private _appInstance : express.Application;
    private _routers : Array<IExpositionDetail>;

    //#endregion


    //#regrion Methods
    
    constructor (session : EMSession, appInstance : express.Application)
    {
        this._session = session;
        this._appInstance = appInstance;
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
            entityController = new EMEntityController<TDocument, TEntity>( entityName, this._session , resourceName);   
        
        this._routers.push( { entityName : entityName, controller : entityController, basePath } );
        this._appInstance.use('/' + basePath, entityController.router);
    }

    getExpositionDetails() : Array<{ entityName : string, resourceName : string, basePath : string }> 
    {
        return this._routers.map( r => { return { entityName: r.entityName, resourceName: r.controller.resourceName, basePath: r.basePath} } );
    }

    //#endregion


    //#regrion Accessors (Properties)
    
    get session () : EMSession
    {
        return this._session;
    }

    get appInstance () : express.Application
    {
        return this._appInstance;
    }

    //#endregion

}

export { EMRouterManager }