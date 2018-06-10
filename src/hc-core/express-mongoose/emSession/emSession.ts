import mongoose = require('mongoose');
import { HcSession } from '../../hcSession/hcSession';
import { EMQueryWrapper } from '../emUtilities/emUtilities';
import { EMEntity, EntityDocument } from '../emEntity/emEntity';
import { MongooseDocument } from 'mongoose';
import { Entity } from '../../hcEntity/hcEntity';
import { IMetaDataInfo, EntityInfo, PersistenceType, AccessorInfo} from '../../hcMetaData/hcMetaData';
import { type } from 'os';
 
class EMSession extends HcSession
{
    //#region Properties (Fields)

    private _mongooseInstance : any;
    private _mongooseConnection : mongoose.Connection;
    private _devMode : boolean;

    //#endregion



    //#region Methods

    constructor ()
    {
        super();
    }
    
    connect( url : string, success? : () => void, error ? : (err) => void ) : void
    {
        this._mongooseConnection = mongoose.createConnection("mongodb://" + url); 
    }

    getModel<T extends EntityDocument >(entityName : string) : mongoose.Model<T>
    {
        return <mongoose.Model<T>>(this.entitiesInfo.find( e => e.name == entityName ).model);
    } 
    //registerEntity<TDocument extends mongoose.Document, TEntity extends EMEntity>(entityName: string, structureSchema : Object, type: { new( session: EMSession, document : EntityDocument ) : TEntity} ) : void
    registerEntity<TDocument extends mongoose.Document, TEntity extends EMEntity>( type: { new( session: EMSession, document : EntityDocument ) : TEntity }, entityInfo : EntityInfo ) : void
    {
        //var info : EntityInfo = (<any>type).entityInfo; 
        var structureSchema = entityInfo.getCompleteSchema();
        var entityName = entityInfo.name;
        
        if (this.entitiesInfo.filter( e => e.name == entityName ).length == 0)
        {
            var schema : mongoose.Schema;
            var model : mongoose.Model<TDocument>;
            
            //schema = <mongoose.Schema>( this._mongooseInstance.Schema(structureSchema) );
            schema = new mongoose.Schema(structureSchema);
            model = this._mongooseConnection.model<TDocument>(entityName, schema);
            
            this.addEntityInfo( 
                { 
                    name: entityName,
                    info: entityInfo, 
                    schema: schema, 
                    model: model, 
                    activateType: (d : EntityDocument) => {
                        return new type(this, d);
                    }
                }
            );
        }
        else
            console.warn('Attempt to duplicate entity already registered: ' + entityName );
    }

    createDocument<T extends EntityDocument>(entityName: string, document: T ) : Promise<T>
    {   
        return new Promise<T>((resolve, reject)=>{
            let model = this.getModel<T>(entityName);
            this.manageDocumentCreation(document);
            model.create(document).then( 
                value => resolve(value), 
                error => reject( this.createError(error, 'Session: Error in create document' )));
        });
    }

    updateDocument<T extends EntityDocument>(entityName: string, document: T ) : Promise<T>
    {   
        return new Promise<T>((resolve, reject)=>{        
            let model = this.getModel<T>(entityName);
            this.manageDocumentUpdate(document);
            model.findByIdAndUpdate( document._id, document, (error, result) => {
                if (!error)
                {
                    this.findDocument(entityName, document._id).then(
                        res => resolve(<T>res),
                        err => reject(err)
                    );
                }
                else
                    reject( this.createError(error, 'Session: Error in update document') );
            } );
        });
    }


    listDocuments<T extends EntityDocument>(entityName: string) : Promise<Array<T>>;
    listDocuments<T extends EntityDocument>(entityName: string, options : { filters? : Array<EMSessionFilter>, skip? : number, take? : number, sorting? : Array<EMSessionSort> } ) : Promise<Array<T>>;
    listDocuments<T extends EntityDocument>(entityName: string, options? : { filters? : Array<EMSessionFilter>, skip? : number, take? : number, sorting? : Array<EMSessionSort> } ) : Promise<Array<T>>
    {        
        return new Promise<Array<T>>((resolve, reject)=>{

            //PREPARE QUERY =====>>>>>           
            let skip = options != null && options.skip != null ? options.skip : 0;
            let take = options != null && options.take != null ? options.take : null;

            //Construct Mongo parameters
            let mongoFilters = this.resolveToMongoFilters(entityName, options != null && options.filters != null ? options.filters : null);
            if (mongoFilters.error)
                reject( this.createError( null, mongoFilters.message ));
            
            let mongoSorting = this.resolveToMongoSorting(entityName, options != null && options.sorting != null ? options.sorting : null);
            if ( mongoSorting != null && mongoSorting.error)
                reject( this.createError( null, mongoSorting.message ));
            

            //Create Query
            let query = this.getModel<T>(entityName).find( mongoFilters.filters );

            //Order Query
            if (mongoSorting != null && mongoSorting.sorting != null)
                query = query.sort( mongoSorting.sorting );
            
            //Limit Query
            if (skip > 0)
                query = query.skip(skip);
            if (take != null)
                query = query.limit(take);
            
            //EXECUTE QUERY =====>>>>>
            query.exec(( error, result ) => {
                if (!error)
                    resolve(result);   
                else
                     reject( this.createError(error, 'Session: Error in retrive docments') );                
            });
        }); 
    }

    findDocument<T extends EntityDocument>(entityName : string, id: string ) : Promise<T>
    {
        return new Promise<T>( (resolve, reject ) => { 
            this.getModel<T>(entityName).where("deferredDeletion").ne(true).where("_id", id).then( 
                res => resolve( res != null && res.length > 0 ? res[0] : null ),
                err => reject ( this.createError(err, 'Session: Error in retrive single document') ) 
            );
        });
    }

    deleteDocument<T extends EntityDocument>(entityName: string, document: T) : Promise<void>
    {        
        return new Promise<void>((resolve, reject)=>{        
            let model = this.getModel<T>(entityName);
            
            this.manageDocumentDeletion(document);

            model.findByIdAndUpdate( document._id, document, (error, result) => {
                if (!error)
                    resolve();
                else
                    reject ( this.createError(error, 'Session: Error in delete document') );
            } );
        });
    }

    activateEntityInstance<TEntity extends EMEntity, TModel extends EntityDocument>(name: string, document : TModel ) : TEntity
    {        
        return <TEntity>this.entitiesInfo.find(a => a.name == name).activateType(document);
    }

    getMetadataToExpose(entityName : string) : Array<{ name : string, type : string, persistent : boolean}>
    {
        let info = <EntityInfo>(this.entitiesInfo.find( e => e.name == entityName).info);
        return info.getExposedAccessors().map( accessor => { 
            return { 
                name: accessor.name, 
                type: accessor.type, 
                persistent: (accessor.schema != null || accessor.persistenceType == PersistenceType.Auto ) 
            } 
        });
    }

    enableDevMode () : void
    {
        this._devMode = true;
    }

    disableDevMode () : void
    {
        this._devMode = false;
    }

    private createError(error : any, message : string)
    {
        if (this._devMode)
        {
            console.warn('DevMode: Error in EMSession: ' + message);    
            return new EMSessionError(error, message);
        }
        else
            return new EMSessionError(null, 'Internal session error');
    }

    private manageDocumentCreation<TDocument extends EntityDocument>(document : TDocument) : void
    {
        document.created = new Date();
        document.deferredDeletion = false;
    }

    private manageDocumentUpdate<TDocument extends EntityDocument>(document : TDocument) : void
    {
        document.modified = new Date();
    }

    private manageDocumentDeletion<TDocument extends EntityDocument>(document : TDocument) : void
    {
        document.deleted = new Date();
        document.deferredDeletion = true;
    }

    private resolveToMongoFilters(entityName : string, filters? : Array<EMSessionFilter>) : { error : boolean, filters?: any, message? : string }
    {        
        let info : EntityInfo = this.entitiesInfo.find( f => f.name == entityName).info;
        let persistentMembers = info.getAllMembers().filter( m => (m instanceof AccessorInfo) && m.schema != null ).map( m => { return  { property: m.name, type: m.type } } );

        //Filter for defferred deletion.
        let mongoFilters : any;
            
        // Convert all the fixed and optional filters in Mongoose Filetrs
        if (filters != null && filters.length > 0)
        {
            //mongoFilters = { $and : [ { deferredDeletion: { $in: [null, false] } } ] };  
            mongoFilters = { $and : [ { deferredDeletion: false } ] };
            let opFilters = [];
            let errFilters : string;

            //get all filters
            for (let filter of filters)
            {
                let pMember = persistentMembers.find( pm => pm.property == filter.property);
                if (pMember == null)
                {
                    errFilters = 'Attempt to filter by a non persistent member';
                    break;
                }
                
                //Single mongo filter
                let mongoFilterConversion = this.parseMongoFilter( filter, pMember.type );
                if ( mongoFilterConversion.err)
                {   
                    errFilters = mongoFilterConversion.message;
                    break;
                }

                if (filter.filterType == FilterType.Fixed)
                    mongoFilters.$and.push( mongoFilterConversion.value );   
                
                if (filter.filterType == FilterType.Optional)
                    opFilters.push( mongoFilterConversion.value );
            }

            if( opFilters.length > 0)
            {
                if (opFilters.length > 1)
                    mongoFilters.$and.push( { $or: opFilters });
                else
                    mongoFilters.$and.push( opFilters[0] );
            }
                
            if (errFilters != null)
                return { error: true, message: errFilters }; 
        }
        else
        {
            //mongoFilters = { deferredDeletion: { $in: [null, false] }  };
            mongoFilters = { deferredDeletion: false };
        }
               
        
        return { error: false, filters: mongoFilters };
    }

    private parseMongoFilter( f : EMSessionFilter, propertyType : string ) : { err : boolean, value?: any, message? : string }
    {           
        //Check and convert the filter value 
        let valueFilter : any; //value to mongo query
        switch(propertyType)
        {
            case 'Number':
                if ( isNaN(f.value as any) )
                    return { err: true, message: `The value for a filter in the property "${f.property}" must be a number` };
                else
                    valueFilter = parseInt(f.value);
                break;

            default:
                valueFilter = f.value;
        };

        //Set the table of conversions for filters and mongo filters 
        let configConvesions : Array<{ operators : Array<string>, mongoOperator?: string, filterTypes?: Array<string>, valueModifier? : (v) => any }> =
        [
            { operators: ['=', 'eq'] },
            { operators: ['<>', 'ne'], mongoOperator: '$ne' },
            { operators: ['>=', 'gte'], mongoOperator: '$gte', filterTypes: ['Number', 'Date'],  },
            { operators: ['<=', 'lte'], mongoOperator: '$lte', filterTypes: ['Number', 'Date'] },
            { operators: ['>', 'gt'], mongoOperator: '$gt', filterTypes: ['Number', 'Date'] },
            { operators: ['<', 'lt'], mongoOperator: '$lt', filterTypes: ['Number', 'Date'] },
            { operators: ['lk'], mongoOperator: '$regex', filterTypes: ['String'], valueModifier: (v) => { return  '.*' + v + '.*'} }
        ];

        //Make the conversion 
        let confIndex = -1;
        
        let conf = configConvesions.find( cc => cc.operators.find( o  => o == f.operator) != null);
        if (conf != null)
        {
            valueFilter = conf.valueModifier != null ? conf.valueModifier(valueFilter) : valueFilter;

            if ( conf.filterTypes == null || ( conf.filterTypes != null && conf.filterTypes.find( at => at == propertyType ) != null) ) 
            {
                let value : any;

                if (conf.mongoOperator)
                    value = { [f.property] : { [conf.mongoOperator ] : valueFilter} };
                else
                    value = { [f.property] : valueFilter };
                    
                return { err: false, value };
            }                
            else
                return { err: true, message: `It is not possible to apply the the operator "${f.operator}" to the property "${f.property}" because it is of type "${propertyType}"` };
        }
        else
            return { err: true, message: `Not valid operator ${f.operator} for filtering`};
    }

    private resolveToMongoSorting (entityName : string, sorting? : Array<EMSessionSort>) : { error : boolean, sorting?: any, message? : string }
    {        
        if (sorting != null && sorting.length > 0)
        {
            let info : EntityInfo = this.entitiesInfo.find( f => f.name == entityName).info;
            let persistentMembers = info.getAllMembers().filter( m => (m instanceof AccessorInfo) && m.schema != null ).map( m => { return  { property: m.name, type: m.type } } );

            let errSorting : string;
            let mongoSorting : any = {};

            for (let sort of sorting)
            {
                let pMember = persistentMembers.find( pm => pm.property == sort.property);
                if (pMember == null)
                {
                    errSorting = 'Attempt to sort by a non persistent member';
                    break;
                }
                
                let mst : string;
                if (sort.sortType == SortType.ascending)
                    mst = 'asc';
                if (sort.sortType == SortType.descending)
                    mst = 'desc'

                mongoSorting[sort.property] = mst; 
            }

            if (errSorting != null)
                return { error: true, message: errSorting };
                
            return { error: false, sorting: mongoSorting };
        }
        else
            return null;
        
    }

    
    throwException (message : string) : void
    {
        if (this._devMode)
            console.error('DEV-MODE: ' + message);
        else
            throw new Error(message);
    }
    
    throwInfo(message : string) : void;
    throwInfo(message : string, warnDevMode : boolean) : void;
    throwInfo(message : string, warnDevMode? : boolean) : void
    {
        warnDevMode = warnDevMode != null ? warnDevMode : true;

        if (warnDevMode && this._devMode)
            console.warn('DEV-MODE: ' + message);
        else
            console.info(message);
    }

    //#endregion



    //#region Accessors (Properties)

    //#endregion
}

class EMSessionError
{
    constructor (public error : any, public message : string )
    { }
}

interface EMSessionFilter
{
    property: string,
    operator: string,
    value: string,
    filterType: FilterType
}

interface EMSessionSort
{
    property: string,
    sortType : SortType
}

enum FilterType
{
    Fixed = 1,
    Optional = 2
}

enum SortType
{
    ascending = 1,
    descending = 2
}

export { EMSession, EMSessionError, EMSessionFilter, FilterType, SortType, EMSessionSort }