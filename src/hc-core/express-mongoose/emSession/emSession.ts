import mongoose = require('mongoose');
import { HcSession } from '../../hcSession/hcSession';
import { EMQueryWrapper } from '../emUtilities/emUtilities';
import { EMEntity, EntityDocument } from '../emEntity/emEntity';
import { MongooseDocument } from 'mongoose';
import { Entity } from '../../hcEntity/hcEntity';
import { IMetaDataInfo, EntityInfo, PersistenceType} from '../../hcMetaData/hcMetaData';
 
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
    listDocuments<T extends EntityDocument>(entityName: string, options : { filters? : Array<EMSessionFilter>, skip? : number, take? : number } ) : Promise<Array<T>>;
    listDocuments<T extends EntityDocument>(entityName: string, options? : { filters? : Array<EMSessionFilter>, skip? : number, take? : number }) : Promise<Array<T>>
    {        
        return new Promise<Array<T>>((resolve, reject)=>{

            let manageResult = ( error, result ) => {
                if (!error)
                    resolve(result);   
                else
                     reject( this.createError(error, 'Session: Error in retrive docments') );                
            };

            //PREPARE QUERY =====>>>>>           
            let skip = options != null && options.skip != null ? options.skip : 0;
            let take = options != null && options.take != null ? options.take : null;

            //Construct Mongo Filters
            let mongoFilters = this.getMongoFilters(options != null && options.filters != null ? options.filters : null);

            //Create Query
            let query = this.getModel<T>(entityName).find( mongoFilters );
            
            //Limit Query
            if (skip > 0)
                query = query.skip(skip);
            if (take != null)
                query = query.limit(take);
            

            //EXECUTE QUERY =====>>>>>
            query.exec(manageResult);
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

    private getMongoFilters(filters? : Array<EMSessionFilter>) : any
    {
        let mongoFilters : any = { $and: [ { deferredDeletion: { $ne: true } } ] };
            
        if (filters != null && filters.length > 0)
        {
            let fixedFilters = filters.filter( f => f.filterType == FilterType.Fixed );
            if (fixedFilters.length > 0)
                fixedFilters.forEach( f => mongoFilters.$and.push( this.parseMongoFilter(f) ) );
            
            let optionalFilters = filters.filter( f => f.filterType == FilterType.Optional );
            if (optionalFilters.length > 0)
                 mongoFilters.$and.push( { $or: optionalFilters.map( f => this.parseMongoFilter(f) ) }); 
        }

        return mongoFilters;
    }

    private parseMongoFilter( f : EMSessionFilter ) : any
    {
        let singleMongoFilter = {};

        switch (f.operator)
        {
            case '=':
            case 'eq':
                singleMongoFilter[f.property] = f.value;
                break;
            case '>=':
            case 'gte':
                singleMongoFilter[f.property] = { $gte: parseInt(f.value) };
                break;
            case '<=':
            case 'lte':
                singleMongoFilter[f.property] = { $lte: parseInt(f.value) };
                break;
            case '>':
            case 'gt':
                singleMongoFilter[f.property] = { $gt: parseInt(f.value) };
                break;
            case '<':
            case 'lt':
                singleMongoFilter[f.property] = { $lt: parseInt(f.value) };        
                break;
        }

        return singleMongoFilter;
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

enum FilterType
{
    Fixed = 1,
    Optional = 2
}

export { EMSession, EMSessionError, EMSessionFilter, FilterType }