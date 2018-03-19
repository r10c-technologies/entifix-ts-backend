import express = require('express');
import mongoose = require('mongoose');
import { EMSession } from '../emSession/emSession';
import { EMEntityController } from '../emEntityController/emEntityController'; 
import { EMEntity, EntityDocument } from '../emEntity/emEntity';

class IExpositionDetail
{
    entityName : string;
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
    exposeEntity<TDocument extends EntityDocument, TEntity extends EMEntity>( entityName: string, controller : EMEntityController<TDocument, TEntity>) : void;
    exposeEntity<TDocument extends EntityDocument, TEntity extends EMEntity> ( entityName : string, controller? : EMEntityController<TDocument, TEntity> ) : void
    {
        let entityController : EMEntityController<TDocument, TEntity>;
        if (controller == null)
            entityController = new EMEntityController<TDocument, TEntity>( entityName, this._session );
        else
            entityController = controller;
               
        this._routers.push( { entityName : entityName, controller : entityController } );
        this._appInstance.use('/api', entityController.router);
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