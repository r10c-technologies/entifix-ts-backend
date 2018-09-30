import mongoose = require('mongoose');
import { EMSession, EMSessionFilter, FilterType, SortType, EMSessionSort } from '../emSession/emSession';
import { EMEntity, EntityDocument  } from '../emEntity/emEntity';
import { EntityMovementFlow } from '../../hc-core/hcEntity/hcEntity';
import { EMResponseWrapper } from '../emWrapper/emWrapper';
import HttpStatus = require('http-status-codes');
import express = require('express')
import { EntityInfo, AccessorInfo } from '../../hc-core/hcMetaData/hcMetaData';
import { EMMemberActivator } from '../..';
import { EMRouterManager } from '../emRouterManager/emRouterManager';

class EMEntityController<TDocument extends EntityDocument, TEntity extends EMEntity>
{
    //#region Properties (Fields)

    private _entityName : string;
    private _session : EMSession;
    private _responseWrapper : EMResponseWrapper<TDocument, TEntity>;
    private _useEntities : boolean;
    private _resourceName : string;

    protected _router : express.Router;
    
    //#endregion


    //#region Methods

    constructor ( entityName : string, session : EMSession);
    constructor ( entityName : string, session : EMSession, resourceName : string);
    constructor ( entityName : string, session : EMSession, resourceName? : string)
    {
        this._entityName = entityName;
        this._session = session;
        this._useEntities = true;
        this._responseWrapper = new EMResponseWrapper(session);
        this._resourceName = resourceName || entityName.toLowerCase();

        this._router = express.Router();
    }

    retrieve ( request : express.Request, response : express.Response) : void
    {
        //Manage query params options
        let queryParamsConversion = this.validateQueryParams(request, response);

        if(queryParamsConversion.error)
            return;
            
        let queryParams = queryParamsConversion.queryParams;
        
        let filterParam = queryParams.filter( qp => qp.paramName == 'filter');
        let filters = filterParam.length > 0 ? filterParam.map( qp => <Filter>qp) : null; 
        
        let sortParam = queryParams.filter( qp => qp.paramName == 'sort');
        let sorting = sortParam.length > 0 ? sortParam.map( qp => qp as Sort ) : null;

        let skipParam = queryParams.find( qp => qp.paramName == 'skip');
        let skip = skipParam != null ? parseInt(skipParam.paramValue) : null;

        let takeParam = queryParams.find( qp => qp.paramName == 'take');
        let take = takeParam != null ? parseInt(takeParam.paramValue) : 100; // Retrive limit protector

        //Call the execution of mongo query inside EMSession
        if (this._useEntities)
            this._session.listEntities<TEntity, TDocument>(this._entityName, { filters, skip, take, sorting } ).then(
                entityResults => this._responseWrapper.entityCollection(response, entityResults),
                error => this._responseWrapper.exception(response, error)
            );
        else
            this._session.listDocuments<TDocument>(this._entityName, { filters, skip, take, sorting } ).then(
                docResults => this._responseWrapper.documentCollection(response, docResults),
                error => this._responseWrapper.exception(response, error)
            );
    }

    retrieveById ( request : express.Request, response : express.Response ) : void
    {
        if (this._useEntities)
            this._session.findEntity<TEntity, TDocument>(this.entityInfo, request.params._id).then(
                entityResult => this._responseWrapper.entity(response, entityResult),
                error => this._responseWrapper.exception(response, error)
            );            
        else
            this._session.findDocument<TDocument>(this._entityName, request.params._id).then(
                docResult => this._responseWrapper.document(response, docResult),
                error => this._responseWrapper.exception(response, error)
            ); 
    }

    retriveByIdOverInstance<TEntityInstanced>( request : express.Request, response : express.Response, instance : TEntityInstanced, path : string ) : void
    {
        
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
                result => this._responseWrapper.document(response, result, { status: HttpStatus.CREATED }),
                error => this._responseWrapper.exception(response, error)
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
                result => this._responseWrapper.document(response, result, { status: HttpStatus.ACCEPTED }),
                error => this._responseWrapper.exception(response, error)
            );
        }
        else
             this.save(request, response);
    }

    delete ( request : express.Request, response : express.Response ) : void
    {
        let id = request.params._id;
        let responseOk = () => this._responseWrapper.object( response, {'Delete status': 'register deleted '} );
        let responseError = error => this._responseWrapper.exception(response, responseError);

        if (this._useEntities)
        {   
            this._session.findEntity(this.entityInfo, id).then(
                entity => {
                    entity.delete().then( movFlow => {
                        if (movFlow.continue)
                            responseOk();
                        else
                            this._responseWrapper.logicError(response, movFlow.message, movFlow.details);
                    })
                },
                error => this._responseWrapper.exception( response, error)    
            )
        }
        else
        {
            this._session.findDocument<TDocument>(this._entityName, request.params._id).then(
                docResult => this._session.deleteDocument(this._entityName, docResult).then( responseOk, responseError ),
                error => this._responseWrapper.exception(response, error)            
            );
        }
    }

    private save( request : express.Request, response : express.Response) : void
    {
        this.validateDocumentRequest(request, response).then( (validation : RequestValidation<TDocument> ) => {
            if (validation)
            {
                this._session.activateEntityInstance<TEntity,TDocument>(this.entityInfo, validation.document ).then(
                    entity => {
                        entity.save().then(
                            movFlow => {
                                if (movFlow.continue)
                                    this._responseWrapper.entity(response, entity, { devData: validation.devData });
                                else
                                    this._responseWrapper.logicError(response, movFlow.message, { errorDetails: movFlow.details,  devData: validation.devData });         
                            },
                            error => this._responseWrapper.exception(response, error)
                        );
                    },
                    error => this._responseWrapper.exception( response, error)
                );
            }
        });
    }

    createRoutes( routerManager : EMRouterManager) : void
    {
        // It is important to consider the order of the class methods setted for the HTTP Methods 

        //Create base routes
        // this._router.get('/' + this._resourceName + '/:path*', ( request, response, next) => this.checkExtendRoutes(request, response, next, routerManager));
        
        this._router.get('/' + this._resourceName, ( request, response, next )=> this.retrieve(request, response) );
        this._router.get('/' + this._resourceName + '/metadata', (request, response, next) => this.retriveMetadata(request, response, next) ); 
        this._router.get('/' + this._resourceName + '/:_id', (request, response, next) => this.retrieveById( request, response ) );
        this._router.post('/' + this._resourceName, (request, response, next) => this.create(request, response) );
        this._router.put('/' + this._resourceName, (request, response, next) => this.update(request, response) );
        this._router.delete('/' + this._resourceName + '/:_id',(request, response, next) => this.delete(request, response ));
      
        



    }

    checkExtendRoutes( request : express.Request, response : express.Response, next : express.NextFunction, routerManager : EMRouterManager) : void
    {        
        let arrayPath = request.path.split('/');

        if (arrayPath.length > 1)
        {
            let extensionAccessors = 
                this.entityInfo.getAllMembers()
                    .filter( memberInfo => memberInfo instanceof AccessorInfo && (memberInfo as AccessorInfo).activator != null && (memberInfo as AccessorInfo).activator.extendRoute == true )
                    .map( memberInfo => memberInfo as AccessorInfo );

            let extensionAccessor = extensionAccessors.find( ea => ea.activator.resourcePath == arrayPath[1]);
            if (extensionAccessor)
            {
                let tempId = arrayPath[0];
                let controller = routerManager.findController(extensionAccessor.className);
            
                //RECURSIVIDAD_PARA_OBTENER_LA_INSTANCIA_DEL_OBJETO_MEDIENTE_LA_RUTA
            }
            else
                next();
        }
        else
            next();
    }




    private validateQueryParams( request : express.Request, response : express.Response ) : { queryParams?: Array<QueryParam>, error : boolean }
    {
        let queryParams = new Array<QueryParam>();

        if (request.query != null)
            for ( var qp in request.query)
            {
                switch (qp) 
                {
                    case 'fixed_filter':
                        let addFixedFilter = fv => queryParams.push( new Filter (fv, FilterType.Fixed) );
                        let fixedFilterValue = request.query[qp];
                        
                        if (fixedFilterValue instanceof Array)
                            fixedFilterValue.forEach( addFixedFilter );
                        else
                            addFixedFilter(fixedFilterValue);

                        break;

                    case 'optional_filter':
                        let addOptionalFilter = fv => queryParams.push( new Filter (fv, FilterType.Optional) );
                        let optionalFilterValue = request.query[qp];
                        
                        if (optionalFilterValue instanceof Array)
                            optionalFilterValue.forEach( addOptionalFilter );
                        else
                            addOptionalFilter(optionalFilterValue);

                        break;

                    case 'order_by':
                        let addSorting = sv => queryParams.push( new Sort(sv) );
                        let sortValue = request.query[qp];

                        if (sortValue instanceof Array)
                            sortValue.forEach( addSorting );
                        else
                            addSorting(sortValue);

                        break;

                    case 'skip':
                    case 'take':
                        queryParams.push( new QueryParam(qp, request.query[qp] ) );
                        break;

                    //To implmente more query params
                    //case <nameparam>:
                    //...
                    //...
                    //  break;

                    default:
                        let details = { message: `Query param not allowed "${qp}"` };
                        this._responseWrapper.handledError( response, 'BAD QUERY PARAM', HttpStatus.BAD_REQUEST, details );
                        return { error: true };
                }
            }
      
        return { error: false, queryParams }; 
    }

    
    protected validateDocumentRequest ( request : express.Request, response : express.Response ) : Promise<RequestValidation<TDocument> | void>
    {
        return new Promise<RequestValidation<TDocument>>( (resolve, reject) => {

            if  ( (typeof request.body) != 'object' )
                return resolve({ error: 'The data provided is not an object', errorData: request });

            let parsedRequest = EMEntity.deserializeAccessors(this.entityInfo, request.body);
            if (parsedRequest.nonValid)
                return resolve({ error: 'There are non valid values for the resource', errorData: parsedRequest.nonValid });
            
            let devData = [];
            if ( parsedRequest.readOnly )
                 devData.push({ message: 'The request has read only accessors and these are going to be ignored', accessors : parsedRequest.readOnly });
        
            if ( parsedRequest.nonPersistent )
                 devData.push({ message: 'The request has non persistent accessors and these could be ignored', accessors : parsedRequest.nonPersistent });

            if (parsedRequest.persistent._id)
            {
                this._session.findDocument<TDocument>(this._entityName, parsedRequest.persistent._id).then(
                    document => {
                        document.set(parsedRequest.persistent);
                        resolve( { document, devData } );
                    },
                    err => reject(err)
                );
            }
            else
            {
                let model = this._session.getModel(this._entityName);
                let document : TDocument;

                document = new model(parsedRequest.persistent) as TDocument;                
                resolve({ document, devData });
            }
        }).then( 
            validation => {
                if (validation.error)
                {
                    let details : any = { 
                        validationError : validation.error,
                        validationDetails: validation.errorData
                    };
                
                    this._responseWrapper.handledError( response, 'NOT VALID PAYLOAD FOR THE RESOURCE', HttpStatus.BAD_REQUEST, details )
                    return null;    
                }
            
                return validation;                                       
            },
            error => this._responseWrapper.exception( response, error )
        );
    }    



    //#endregion


    //#region Accessors (Properties)

    
    private get entityInfo()
    {
        return this._session.getInfo(this._entityName);
    }

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

    get resourceName ()
    { return this._resourceName; }

    //#endregion
}

class QueryParam 
{
    //#region Properties

    protected _paramName : string;
    protected _paramValue : string;

    //#endregion

    //#region Methods

    constructor(paramName : string, paramValue : string )
    {        
        this._paramName = paramName;
        this._paramValue = paramValue;
    }

    //#endregion

    //#region Accessors

    get paramName ()
    { return this._paramName; }
    set paramName (value)
    { this._paramName = value; }
    
    get paramValue ()
    { return this._paramValue; }
    set paramValue (value)
    { this._paramValue = value; }
    

    //#endregion
}

class Sort extends QueryParam implements EMSessionSort
{
    //#region Properties

    private _property : string;
    private _sortType: SortType;

    //#endregion

    //#region Methods

    constructor( paramValue : string )
    {
        super( 'sort', paramValue);
        this.manageValue();
    }

    private manageValue() : void
    {
        let splitted = this._paramValue.split('|');

        this._property = splitted[0];
        this._sortType = SortType.ascending; // Default value

        if (splitted[1] == 'desc')
            this._sortType = SortType.descending;
    }

    //#endregion

    //#region Accessors

    get property ()
    { return this._property; }
    set property (value)
    { this._property = value; }
    
    get sortType ()
    { return this._sortType; }
    set sortType (value)
    { this._sortType = value; }
    
    //#endregion

}
 
class Filter extends QueryParam implements EMSessionFilter
{
    //#region Properties

    private _property : string;
    private _operator : string;
    private _value : string;
    private _filterType: FilterType;
    //#endregion

    //#region Methods

    constructor( paramValue : string, filterType: FilterType)
    {
        super( 'filter', paramValue);
        this._filterType = filterType;
        this.manageValue();
    }

    private manageValue() : void
    {
        let splitted = this._paramValue.split('|');

        this._property = splitted[0];
        this._operator = splitted[1];
        this._value = splitted[2];
    }

    //#endregion

    //#region Accessors

    get property ()
    { return this._property; }
    set property (value)
    { this._property = value; }
    
    get operator ()
    { return this._operator; }
    set operator (value)
    { this._operator = value; }
    
    get value ()
    { return this._value; }
    set value (v)
    { this._value = v; }
    
    get filterType ()
    { return this._filterType; }
    set filterType (value)
    { this._filterType = value; }
    
    //#endregion
}

interface RequestValidation<TDocument>
{ 
    document? : TDocument; 
    error? : string; 
    errorData? : any;
    devData? : any; 
}


export { EMEntityController }