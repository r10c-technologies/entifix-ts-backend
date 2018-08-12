import mongoose = require('mongoose');
import { EMSession, EMSessionFilter, FilterType, SortType, EMSessionSort } from '../emSession/emSession';
import { EMEntity, EntityDocument  } from '../emEntity/emEntity';
import { EntityMovementFlow } from '../../hcEntity/hcEntity';
import { EMResponseWrapper } from '../emWrapper/emWrapper';
import HttpStatus = require('http-status-codes');
import express = require('express')
import { EntityInfo } from '../../hcMetaData/hcMetaData';

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
        //Manage query params options
        let queryParamsConversion = this.getQueryParams(request);

        if(queryParamsConversion.error)
            this.responseWrapper.error( response, queryParamsConversion.message, 400 );
        
        let queryParams = queryParamsConversion.queryParams;
        
        let filterParam = queryParams.filter( qp => qp.paramName == 'filter');
        let filters = filterParam.length > 0 ? filterParam.map( qp => <Filter>qp) : null; 
        
        let sortParam = queryParams.filter( qp => qp.paramName == 'sort');
        let sorting = sortParam.length > 0 ? sortParam.map( qp => qp as Sort ) : null;

        let skipParam = queryParams.find( qp => qp.paramName == 'skip');
        let skip = skipParam != null ? parseInt(skipParam.paramValue) : null;

        let takeParam = queryParams.find( qp => qp.paramName == 'take');
        let take = takeParam != null ? parseInt(takeParam.paramValue) : 100;

        //Call the execution of mongo query in EMSession
        this._session.listDocuments<TDocument>(this._entityName, { filters, skip, take, sorting } )
                        .then(
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
                    entity.delete().then( 
                        movFlow => { 
                            if (movFlow.continue)
                                responseOk();
                            else
                                this._responseWrapper.logicError(response, movFlow.message, movFlow.details);
                        }
                        , responseError);
                }
                else
                    this._session.deleteDocument(this.entityName, result).then( responseOk, responseError );        
            },
            error => this._responseWrapper.sessionError(response, error)
        
        );
    
    }

    private save( request : express.Request, response : express.Response) : void
    {
        let info = this._session.getInfo(this._entityName);
        let document = EMEntity.deserializePersistentAccessors(info, request.body) as TDocument;
        let entity = this._session.activateEntityInstance<TEntity,TDocument>(this._entityName, document);

        entity.save().then(
            movFlow => {
                if (movFlow.continue)
                    this._responseWrapper.entity(response, entity);
                else
                    this._responseWrapper.logicError(response, movFlow.message, movFlow.details);         
            },
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

    private getQueryParams( request : express.Request ) : { error: boolean, queryParams?: Array<QueryParam>, message? : string }
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
                        return { error: true, message: `Query param not allowed "${qp}"` };
                }
            }
      
        return { error: false, queryParams }; 
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


export { EMEntityController }