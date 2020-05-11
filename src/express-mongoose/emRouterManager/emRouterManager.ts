import express = require('express');
import mongoose = require('mongoose');
import gridfs = require('gridfs-stream');
import fileUpload = require('express-fileupload');
import fs = require('fs');
import HttpStatus = require('http-status-codes');
import { EMSession } from '../emSession/emSession';
import { EMEntityController } from '../emEntityController/emEntityController'; 
import { EMEntity, EntityDocument } from '../emEntity/emEntity';
import { EMResponseWrapper } from '../emWrapper/emWrapper';
import { Wrapper } from '../../hc-core/hcWrapper/hcWrapper';
import { AccessorInfo, MemberBindingType, EntityInfo } from '../../hc-core/hcMetaData/hcMetaData';
import { EMServiceSession } from '../emServiceSession/emServiceSession';
import { resolve, reject } from 'bluebird';
import { EMMemberActivator, EMMemberTreeActivator } from '../emMetadata/emMetadata';
import { EMEntityMultiKey } from '../emEntityMultiKey/emEntityMultiKey';
import { EMEntityMutltiKeyController } from '../emEntityMultikeyController/emEntityMultiKeyController';
import { createEnumController, ExposeEnumerationOptions } from './enumeration-exposition';

class IExpositionDetail
{
    entityName : string;
    basePath: string;
    controller: any; // Issues with set a type for multiple generic controllers 
}

interface ExposeEntityOptions 
{

}

class EMRouterManager {
    
    //#regrion Properties (Fields)
    
    private _serviceSession : EMServiceSession;
    private _expressAppInstance : express.Application;
    private _routers : Array<IExpositionDetail>;
    private _basePath: string;

    //#endregion


    //#regrion Methods
    
    constructor (serviceSession : EMServiceSession, exrpressAppInstance : express.Application);
    constructor (serviceSession : EMServiceSession, exrpressAppInstance : express.Application, options : { basePath? : string } );
    constructor (serviceSession : EMServiceSession, exrpressAppInstance : express.Application, options? : { basePath? : string })
    {
        this._serviceSession = serviceSession;
        this._expressAppInstance = exrpressAppInstance;
        this._routers = new Array<IExpositionDetail>();

        this._basePath = options && options.basePath ? options.basePath : null;
    }

    
    exposeEntity<TDocument extends EntityDocument, TEntity extends EMEntity> ( entityName : string) : void;
    exposeEntity<TDocument extends EntityDocument, TEntity extends EMEntity> ( entityName : string, options : { controller? : EMEntityController<TDocument, TEntity>, basePath? : string, resourceName? : string  } ) : void;
    exposeEntity<TDocument extends EntityDocument, TEntity extends EMEntityMultiKey> ( entityName : string, options : { controller? : EMEntityMutltiKeyController<TDocument, TEntity>, basePath? : string, resourceName? : string  } ) : void;
    exposeEntity<TDocument extends EntityDocument, TEntity extends EMEntityMultiKey>( entityName : string, options? : { controller? : EMEntityController<TDocument, TEntity> | EMEntityMutltiKeyController<TDocument, TEntity>, basePath? : string, resourceName? : string  } ) : void
    {
        let basePath = this.getCompleteBasePath( options && options.basePath ? options.basePath : null );
        let resourceName = options && options.resourceName ? options.resourceName : null; 

        let entityController = options && options.controller ? options.controller : null;
        if(!entityController) {
            let info = this.serviceSession.getInfo(entityName);
            if (info.instanceOf(EMEntityMultiKey.getInfo()))
                entityController = new EMEntityMutltiKeyController<TDocument, TEntity>( entityName, this, { resourceName } );
            else
                entityController = new EMEntityController<TDocument, TEntity>( entityName, this, { resourceName } );       
        }
            
        this._routers.push( { entityName : entityName, controller : entityController, basePath } );
        this._expressAppInstance.use(basePath, entityController.router);
    }
    

    atachController( controller : EMSimpleController );
    atachController( controller : EMSimpleController, options : { basePath? : string } );
    atachController( controller : EMSimpleController, options? : { basePath? : string } )
    {
        let basePath = this.getCompleteBasePath( options && options.basePath ? options.basePath : null );
        controller.createRoutes();
        this._expressAppInstance.use(basePath, controller.router);
        this._routers.push( { entityName : null, controller: controller, basePath }) ;
    }

    exposeEnumeration( name: string, enumerator : any ) : void;
    exposeEnumeration( name: string, enumerator : any, options : ExposeEnumerationOptions ) : void;
    exposeEnumeration( name: string, enumerator : any, options?  : ExposeEnumerationOptions ) : void
    {
        let basePath = this.getCompleteBasePath( options && options.basePath ? options.basePath : null );

        let newController = createEnumController(name, enumerator, options);
        
        this._expressAppInstance.use(basePath, newController.router);
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

            if (expositionAccessorInfo.activator.bindingType == MemberBindingType.Chunks)
            {
                if(objectToExpose instanceof Array)
                {
                    constructionController.responseWrapper.object(session.response, objectToExpose)
                }
                else
                {
                    let fileCollection : string = session.systemOwner.toLowerCase();
                    let idFile : string = objectToExpose ? objectToExpose._id : null;
                    let fileName: string = objectToExpose.name;
  
                    let gfs = gridfs(session.serviceSession.mongooseConnection.db, mongoose.mongo);

                    gfs.exist({ root: fileCollection, _id: idFile }, function (err, result) {
                        if (!err && result) {
                            let readstream = gfs.createReadStream({root: fileCollection, _id: idFile });
                            readstream.pipe(session.response).attachment(fileName);  
                        } else {
                            constructionController.responseWrapper.logicError(session.response, "The file does not exist in database");
                        }
                    });

                }
            }
               
            else 
            {
                let expositionType : string;
                if (expositionAccessorInfo.activator instanceof EMMemberActivator)
                    expositionType = (expositionAccessorInfo.activator as EMMemberActivator<EMEntity, EntityDocument>) .entityInfo.name;           
                if (expositionAccessorInfo.activator instanceof EMMemberTreeActivator)
                    expositionType = expositionAccessorInfo.className;
                
                let expositionController = this.findController(expositionType);

                let isArray = objectToExpose ? objectToExpose instanceof Array : null;
                if (isArray == null)
                    isArray = expositionAccessorInfo.type == 'Array';

                if (isArray)
                    expositionController.responseWrapper.entityCollection( session.response, objectToExpose );
                else
                    expositionController.responseWrapper.entity(session.response, objectToExpose);
            }                            
        });        
    }

    resolveComplexCreate(session : EMSession, construtorType : string, instanceId : string, expositionAccessorInfo : AccessorInfo, pathOverInstance : Array<string> ) : void
    {   
        let constructionController = this.findController(construtorType);
        let expositionController : EMEntityController<EntityDocument,EMEntity>;
        let validateReqBody : () => Promise<EMEntity|GenericRequestValidation>;

        let sendException = error => constructionController.responseWrapper.exception( session.response, error );

        switch (expositionAccessorInfo.activator.bindingType)
        {
            case MemberBindingType.Reference:
            case MemberBindingType.Snapshot:
                validateReqBody = () => {
                    let expositionType : string;
                    if (expositionAccessorInfo.activator instanceof EMMemberActivator)
                        expositionType = (expositionAccessorInfo.activator as EMMemberActivator<EMEntity, EntityDocument>).entityInfo.name;           
                    if (expositionAccessorInfo.activator instanceof EMMemberTreeActivator)
                        expositionType = expositionAccessorInfo.className;

                    expositionController = this.findController( expositionType );
                    return expositionController.createInstance( session.request, session.response, { alwaysNew: true } );
                }
                break;

            case MemberBindingType.Chunks:
                validateReqBody = () => this.genericValidation( session.request, { bindingType: MemberBindingType.Chunks} );
                break;
        }

        constructionController.findEntity(session, instanceId).then( baseEntity => {
            validateReqBody().then( result => {

                let objectToExpose : any = baseEntity[pathOverInstance[0]];
                let pathTo = pathOverInstance[0];
                let fileEntity : any = {};

                let saveBaseEntity = (objectToSend) => {
                    baseEntity.save().then( movFlow => {
                        if (movFlow.continue) {
                            if(objectToSend instanceof EMEntity)
                                constructionController.responseWrapper.entity( session.response, objectToSend );
                            else
                                constructionController.responseWrapper.object( session.response, objectToSend );
                        }                       
                        else
                            constructionController.responseWrapper.logicError( session.response, movFlow.message);
                    },
                    error => constructionController.responseWrapper.exception( session.response, error ));  
                };

                for (let i = 1; i < pathOverInstance.length; i++) {
                    objectToExpose = objectToExpose ? objectToExpose[pathOverInstance[i]] : null;
                    pathTo = pathTo + '.' + pathOverInstance[i];
                }

                if (result instanceof EMEntity) {
                    if (expositionAccessorInfo.type == 'Array') {
                        if (baseEntity[pathTo] == null)
                                baseEntity[pathTo] = [];

                        (baseEntity[pathTo] as Array<EMEntity>).push(result);
                    }                    
                    else
                        baseEntity[pathTo] = result;
                
                    saveBaseEntity(baseEntity);
                }
                else {
                    if(!result.error) {
                        this.saveEntityChunkMember(session, 
                            expositionAccessorInfo, 
                            pathOverInstance,                                                   
                            baseEntity,
                            construtorType,
                            pathTo,
                            'create',
                            result.data.fileKey) .then((f) => {
                                saveBaseEntity(f);
                        }).catch(e => constructionController.responseWrapper.exception(session.response, e));
                    }
                    else 
                        constructionController.responseWrapper.handledError(session.response, result.error, HttpStatus.BAD_REQUEST);                            
                }               
            }).catch(sendException);        
        }).catch(sendException);
    }

    resolveComplexUpdate(session : EMSession, construtorType : string, instanceId : string, expositionAccessorInfo : AccessorInfo, pathOverInstance : Array<string> ) : void
    {      
        let constructionController = this.findController(construtorType);
        let expositionController : EMEntityController<EntityDocument,EMEntity>;
        let validateReqBody : () => Promise<EMEntity|GenericRequestValidation>;

        let sendException = error => constructionController.responseWrapper.exception( session.response, error );

        switch (expositionAccessorInfo.activator.bindingType)
        {
            case MemberBindingType.Reference:
            case MemberBindingType.Snapshot:
                validateReqBody = () => {
                    let expositionType : string;
                    if (expositionAccessorInfo.activator instanceof EMMemberActivator)
                        expositionType = (expositionAccessorInfo.activator as EMMemberActivator<EMEntity, EntityDocument>) .entityInfo.name;           
                    if (expositionAccessorInfo.activator instanceof EMMemberTreeActivator)
                        expositionType = expositionAccessorInfo.className;
                    
                    expositionController = this.findController( expositionType );
                    let alwaysNew = expositionAccessorInfo.activator.bindingType == MemberBindingType.Snapshot;
                    return expositionController.createInstance( session.request, session.response, { alwaysNew } );
                }
                break;

            case MemberBindingType.Chunks:
                validateReqBody = () => this.genericValidation( session.request, { bindingType: MemberBindingType.Chunks, method:"update"} );
                break;
        }

        constructionController.findEntity(session, instanceId).then( baseEntity => {
            validateReqBody().then( result => {

                let objectToExpose : any = baseEntity[pathOverInstance[0]];
                let pathTo = pathOverInstance[0];

                for (let i = 1; i < pathOverInstance.length; i++) {
                    objectToExpose = objectToExpose ? objectToExpose[pathOverInstance[i]] : null;
                    pathTo = pathTo + '.' + pathOverInstance[i];
                }
                
                let performSave = (entityToSave: EMEntity, objectToSendInResponse? : any) => {
                    entityToSave.save().then( movFlow => {
                        objectToSendInResponse = objectToSendInResponse || entityToSave;
                        if (movFlow.continue) {
                            if(objectToSendInResponse instanceof EMEntity)
                                constructionController.responseWrapper.entity( session.response, objectToSendInResponse);
                            else
                                constructionController.responseWrapper.object( session.response, objectToSendInResponse);
                        }                       
                        else
                            constructionController.responseWrapper.logicError( session.response, movFlow.message);
                    },
                    error => constructionController.responseWrapper.exception( session.response, error ));  
                };

                if ( result instanceof EMEntity) {  
                    if (expositionAccessorInfo.activator.bindingType == MemberBindingType.Snapshot) {
                        if (expositionAccessorInfo.type == 'Array') {
                            let index = (baseEntity[pathTo] as Array<EMEntity>).findIndex( e => e._id.toString() == result._id.toString() );
                            if (index >= 0) 
                                (baseEntity[pathTo] as Array<EMEntity>)[index] = result;
                            else
                                constructionController.responseWrapper.handledError(session.response, `Index not found for item with id [${result._id.toString()}]`, HttpStatus.BAD_REQUEST);
                        }                    
                        else
                            baseEntity[pathTo] = result;

                        performSave(baseEntity, result);
                    }
                    else if (expositionAccessorInfo.activator.bindingType == MemberBindingType.Reference)
                        performSave(result);
                }               
                else
                {            
                    if(!result.error && result.data.fileKey)
                    {
                        this.saveEntityChunkMember(session, 
                                                     expositionAccessorInfo, 
                                                     pathOverInstance,                                                   
                                                     baseEntity,
                                                     construtorType,
                                                     pathTo,
                                                     'update',
                                                     result.data.fileKey) .then((f) => {
                            performSave(baseEntity);
                        }).catch(e => constructionController.responseWrapper.exception(session.response, e));
                    }
                    else
                    {
                        constructionController.responseWrapper.handledError(session.response, result.error, HttpStatus.BAD_REQUEST);
                    }        
                }               
            }).catch(sendException);        
        }).catch(sendException);
    }

    private saveEntityChunkMember(session : EMSession, 
                                    expositionAccessorInfo : AccessorInfo, 
                                    pathOverInstance : Array<string>,                                     
                                    baseEntity: any,
                                    constructorType: string,
                                    pathTo: string,
                                    option: string,
                                    fileKey?: string) : Promise<any>
    {
        return new Promise<any>((resolve, reject) => {
            
            let constructionController = this.findController(constructorType);
            
            let id: string;
            let file;
            let mimetype;
            let filename;;
            let filePath;
            let fileSize;
            let fileEntity;
            let member : string =  expositionAccessorInfo.persistentAlias ? expositionAccessorInfo.persistentAlias : expositionAccessorInfo.name;              
            let fileCollection : string = session.systemOwner.toLowerCase();
            if(option != 'create')
            {
                id  = expositionAccessorInfo.type == 'Array'? pathOverInstance[pathOverInstance.length-1] : baseEntity[member]._id;
            }
            if(option != 'delete')
            {
                file = session.request.files[fileKey];
                mimetype = file.mimetype;
                filename = file.name;
                filePath = file.tempFilePath;
                fileSize = file.size;
                fileEntity = {
                    _id: "",
                    name: filename,
                    fileExtension: mimetype,
                    size: fileSize
                };
            }
                     
            let gfs = gridfs(session.serviceSession.mongooseConnection.db, mongoose.mongo);

            switch(option)
            {
                case 'create': 
                {
                    let writestream = gfs.createWriteStream({filename, content_type:mimetype, root:fileCollection})
                        fs.createReadStream(filePath).pipe(writestream);
                        writestream.on('close', function (file) {
                            fileEntity._id = file._id.toString();  
                            if (expositionAccessorInfo.type == 'Array')
                            {                                                                        
                                (baseEntity[pathTo]).push(fileEntity);
                            }
                            else
                            {
                                baseEntity[pathTo] = fileEntity;
                            }    
                            fileEntity = file;  
                            resolve(fileEntity);                                                         
                        });
                    break;
                }
                case 'update': 
                {
                    gfs.exist({ root: fileCollection, _id: id }, function (err, result) {
                        if (!err && result) 
                        {
                            gfs.remove({root:fileCollection, _id: id }, function (err) {
                                if (!err) 
                                {
                                    let writestream = gfs.createWriteStream({root: fileCollection, _id: id, filename, content_type:mimetype})
                                    fs.createReadStream(filePath).pipe(writestream);
                                    writestream.on('close', function (file) {
                                        fileEntity._id = file._id.toString();
                                        if (expositionAccessorInfo.type == 'Array')
                                        {                                                                
                                            let index = (baseEntity[member]).findIndex( e => e._id == file._id.toString() );
                                            (baseEntity[member]).splice(index, 1);
                                            (baseEntity[member]).push(fileEntity);
                                        }
                                        else
                                        {
                                            baseEntity[pathTo] = fileEntity;
                                        }    
                                        resolve(fileEntity);             
                                    });
                                }
                            });                             
                        } 
                        else 
                        {
                            constructionController.responseWrapper.handledError(session.response, "File not found on database", HttpStatus.BAD_REQUEST);
                        }
                    });
                    break;
                }
                case 'delete': 
                {
                    gfs.exist({_id:  id, root: fileCollection}, function (err, file) {
                        if (!err || file) {
                            gfs.remove({ _id: id, root: fileCollection }, function (err) {
                                if (!err) 
                                {                                        
                                    if (expositionAccessorInfo.type == 'Array')
                                    {                                                          
                                        let index = (baseEntity[member]).findIndex( e => e._id == id);
                                        (baseEntity[member]).splice(index, 1);
                                    }
                                    else
                                    {
                                        baseEntity[member] = null;
                                    }    
                                    resolve(fileEntity);
                                }                                    
                            });
                        } 
                        else 
                        {
                            constructionController.responseWrapper.logicError(session.response, "The file does not exists")
                        }
                    });
                    break;
                }
            }        
        });
    }

    resolveComplexDelete(session : EMSession, construtorType : string, instanceId : string, expositionAccessorInfo : AccessorInfo, pathOverInstance : Array<string> ) : void
    {
        let constructionController = this.findController(construtorType);
        let sendException = error => constructionController.responseWrapper.exception( session.response, error );   

        constructionController.findEntity(session, instanceId).then( baseEntity => {
            let saveBaseEntity = () => {
                baseEntity.save().then( movFlow => {
                    if (movFlow.continue) 
                        constructionController.responseWrapper.logicAccept( session.response, "Record deleted" );
                    else
                        constructionController.responseWrapper.logicError( session.response, movFlow.message);
                },
                error => constructionController.responseWrapper.exception( session.response, error ));  
            };

            let objectToExpose : any = baseEntity[pathOverInstance[0]];
            let pathTo = pathOverInstance[0];
            for (let i = 1; i < pathOverInstance.length; i++) {
                objectToExpose = objectToExpose ? objectToExpose[pathOverInstance[i]] : null;
                pathTo = pathTo + '.' + pathOverInstance[i];
            }

            if (expositionAccessorInfo.activator.bindingType == MemberBindingType.Chunks) {
                this.genericValidation( session.request, { bindingType: MemberBindingType.Chunks, method:"delete"} ).then( result => {
                    if(!result.error && result.data.ok) {
                        this.saveEntityChunkMember(session, 
                            expositionAccessorInfo, 
                            pathOverInstance,                                                   
                            baseEntity,
                            construtorType,
                            pathTo,
                            'delete').then((f) => {
                            saveBaseEntity();
                        }).catch(e => constructionController.responseWrapper.exception(session.response, e));
                    }
                    else
                        constructionController.responseWrapper.handledError(session.response, result.error, HttpStatus.BAD_REQUEST);
                });
            }
            else {
                if (expositionAccessorInfo.type == 'Array') {
                    let tempId = pathOverInstance[pathOverInstance.length - 1];
                    pathTo = pathTo.substring(0, pathTo.length-tempId.length-1);
                    let index = (baseEntity[pathTo] as Array<EMEntity>).findIndex( e => e._id == tempId );
                    if (index >= 0) {
                        (baseEntity[pathTo] as Array<EMEntity>).splice(index, 1);
                        saveBaseEntity();
                    }
                    else
                        constructionController.responseWrapper.handledError(session.response, "Record not found to delete", HttpStatus.BAD_REQUEST );
                }  
                else {
                    baseEntity[pathTo] = null;
                    saveBaseEntity();
                }
            }        
        }).catch(sendException);
    }
    
    getExpositionDetails() : Array<{ entityName : string, resourceName : string, basePath : string }> 
    {
        return this._routers.map( r => { return { entityName: r.entityName, resourceName: r.controller.resourceName, basePath: r.basePath} } );
    }

    findController<TEntity extends EMEntity, TDocument extends EntityDocument>( entityName : string ) : EMEntityController<TDocument, TEntity>
    {
        return this._routers.find( ed => ed.entityName == entityName).controller;
    }

    genericValidation (request : express.Request, options? : { bindingType? : MemberBindingType, method? : string}) : Promise<GenericRequestValidation>
    {
        return new Promise<GenericRequestValidation>( (resolve, reject) => {
            
            if (options && options.bindingType == MemberBindingType.Chunks) {
                if (request.files && Object.keys(request.files).length > 0) {
                    let properties: string[] = Object.keys(request.files);
                    let fileKey = properties[0];
                    resolve({ data: { fileKey: fileKey } });
                }
                else if (options.method && options.method == 'delete') 
                    resolve({ data: { ok: true } });
                else 
                    resolve({ error: 'File Handle Error' });
            } 

            if (options && options.method == 'delete') {
                resolve();
            }

            //Implement more types of validations
            //...
            //...
            //::


        });
    }
    private getCompleteBasePath( postFix? : string ) : string
    {
        let completeBasePath = '/';

        if (this._basePath)
            completeBasePath += this._basePath + '/';

        completeBasePath += postFix || 'api';

        return completeBasePath;
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

    get basePath() : string
    {
        return this._basePath;
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
    private _routerManager : EMRouterManager;
    private _responseWrapper : EMResponseWrapper;

    //#endregion

    //#region Methods

    constructor( routerManager : EMRouterManager, resourceName : string )
    {
        this._resourceName = resourceName;
        this._routerManager = routerManager;             
        this._responseWrapper = new EMResponseWrapper(routerManager.serviceSession);
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

    protected createSession( request : express.Request, response : express.Response ) : Promise<EMSession | void>
    {
        let responseWithException = error => {
            let e = this._routerManager.serviceSession.createError( error, 'Error on create session for the request' );
            this._responseWrapper.exception( response, e );
        }

        return new Promise<EMSession>( (resolve, reject ) => {
            let newSession = new EMSession( this._routerManager.serviceSession, { request, response } );

            //Execute another async tasks before using the new session
            //...
            //...
            //...

            resolve( newSession );
        })
        .then( session => session )        
        .catch( error => responseWithException(error) );
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

    protected get responseWrapper()
    {
        return this._responseWrapper;
    }

    protected get resouceName()
    { return this._resourceName; }

    //#endregion
}

interface GenericRequestValidation
{
    data? : any;
    error? : string; 
    errorData? : any;
    devData? : any; 
}

export { EMRouterManager, EMSimpleController, GenericRequestValidation }