import gridfs = require('gridfs-stream');
import mongoose = require('mongoose');

import { EntityInfo, MemberActivator, AccessorInfo, MemberBindingType } from '../../hc-core/hcMetaData/hcMetaData';
import { Entity } from '../../hc-core/hcEntity/hcEntity';
import { EMEntity, EntityDocument } from '../emEntity/emEntity';
import { EMSession } from '../emSession/emSession';

class GfsMemberActivator extends MemberActivator
{
    //#region Properties

    private _defaultSchema: any;

    //#endregion

    //#region Methods
    
    constructor( resourcePath : string, extendedRoute : boolean );
    constructor( resourcePath : string, extendedRoute : boolean, options : { schema?: any } );
    constructor( resourcePath : string, extendedRoute : boolean, options? : { schema?: any } )
    {
        super( MemberBindingType.Chunks, extendedRoute, resourcePath )

        this._defaultSchema =  options && options.schema ? options.schema : {_id: String, name: String, fileExtension: String, size: Number };
    }

    activateMember( entity : Entity, session : EMSession, accessorInfo : AccessorInfo, options?: { oldValue? : any } ) : Promise<{ oldValue? : any, newValue : any }>
    {
        switch (this.bindingType) 
        {
            case MemberBindingType.Chunks:
                return this.loadFileHeader(entity as EMEntity, session, accessorInfo, options);
                
        }        
    }

    
    private loadFileHeader(entity : EMEntity, session : EMSession, accessorInfo : AccessorInfo, options?: { oldValue? : any } ) : Promise<{ oldValue? : any, newValue : any }>
    {
        return new Promise<{ oldValue? : any, newValue : any }>( (resolve, reject) => {
            
            let doc = entity.getDocument();
            let persistentMember = accessorInfo.persistentAlias || accessorInfo.name;
            let docData = doc[persistentMember];

            let oldValue : any;
            let newValue : any;

            if (docData)
            {
                newValue = docData; 
            }

            if (options && options.oldValue)
            {
                oldValue = options.oldValue; 
            }
            resolve({newValue, oldValue});
        });     
    }

    //#endregion

    //#region Accessors

    get referenceType ( )
    { return this.bindingType == MemberBindingType.Reference ? 'object' : null; }

    get defaultSchema ()
    { return this._defaultSchema }

    /**
     * Temporary fixed value as False
     */
    get considerDuringDeserialization() : boolean {
        return false;
    }

     /**
     * Temporary fixed value as False
     */
    get includeDuringSerialization() : boolean {
        return true;
    }

    /**
     * Temporary fixed value as null
     */
    get defaultAccessor() : string {
        console.error('[X] Trying to extract default accessor from a GFS Member Activator');
        return null;
    }

    //#endregion

}

class EMMemberActivator<TEntity extends EMEntity, TDocument extends EntityDocument> extends MemberActivator 
{
    //#region Properties

    private _entityInfo : EntityInfo;
        
    private _includeDuringSerialization : boolean | string;
    private _consideDuringDeserialization : boolean | string;

    //#endregion

    //#region Methods

    constructor(entityInfo : EntityInfo, bindingType : MemberBindingType, extendRoute : boolean );
    constructor(entityInfo : EntityInfo, bindingType : MemberBindingType, extendRoute : boolean, options : { resourcePath? : string, includeDuringSerialization? : boolean | string, considerDuringDeserialization? : boolean | string } );
    constructor(entityInfo : EntityInfo, bindingType : MemberBindingType, extendRoute : boolean, options? : { resourcePath? : string, includeDuringSerialization? : boolean  | string, considerDuringDeserialization? : boolean | string } )
    {
        super(bindingType, extendRoute, options != null && options.resourcePath != null ? options.resourcePath : entityInfo.name.toLowerCase());

        this._entityInfo = entityInfo;     
        
        
        if (options && options.considerDuringDeserialization != null)
            this._consideDuringDeserialization = options.considerDuringDeserialization;
        else 
            this._consideDuringDeserialization = bindingType == MemberBindingType.Reference ? true : false; 

        if (options && options.includeDuringSerialization != null)
            this._includeDuringSerialization = options.includeDuringSerialization;
        else
            this._includeDuringSerialization = true;
    }

    activateMember( entity : Entity, session : EMSession, accessorInfo : AccessorInfo, options?: { oldValue? : any } ) : Promise<{ oldValue? : any, newValue : any }>
    {
        switch (this.bindingType) 
        {
            case MemberBindingType.Reference:
                if (accessorInfo.type == 'Array')
                    return this.loadArrayInstanceFromDB(entity as EMEntity, session, accessorInfo, options);
                else
                    return this.loadSingleInstanceFromDB(entity as EMEntity, session, accessorInfo, options);

            case MemberBindingType.Snapshot:
                if (accessorInfo.type == 'Array')
                    return this.castArrayInstanceInEntity(entity as EMEntity, session, accessorInfo, options);
                else
                    return this.castSingleInstanceInEntity(entity as EMEntity, session, accessorInfo, options);
        }        
    }

    private loadSingleInstanceFromDB(baseEntity : EMEntity, session : EMSession, accessorInfo : AccessorInfo, options?: { oldValue? : any } ) : Promise<{ oldValue? : any, newValue : any }>
    {
        return new Promise<{ oldValue? : any, newValue : any }>( (resolve, reject) => {
            let doc = baseEntity.getDocument();
            let persistentMember = accessorInfo.persistentAlias || accessorInfo.name;
            let id : string = doc[persistentMember];

            let oldValue : any;
            let newValue : any;
            let promises = new Array<Promise<void>>();
            
            if (id)
                promises.push( session.findEntity<TEntity, TDocument>(this.entityInfo, id).then( 
                    entity => { 
                        baseEntity[accessorInfo.name] = entity; 
                        newValue = entity; 
                    }
                ));           
                            
            if (options && options.oldValue)
                promises.push( session.findEntity<TEntity, TDocument>(this.entityInfo, options.oldValue).then( 
                    entity => { 
                        oldValue = entity;  
                    } 
                ));


            if (promises && promises.length > 0)
                Promise
                    .all( promises )
                    .then( ()=> { resolve({ oldValue, newValue }) })
                    .catch( reject );
            else
                resolve({oldValue, newValue});

        });        
    }

    private loadArrayInstanceFromDB(baseEntity : EMEntity, session : EMSession, accessorInfo : AccessorInfo, options?: { oldValue? : any } ) : Promise<{ oldValue? : any, newValue : any }>
    {
        return new Promise<{ oldValue? : any, newValue : any }>( (resolve, reject) => {
            let doc = baseEntity.getDocument();
            let persistentMember = accessorInfo.persistentAlias || accessorInfo.name;
                
            let promises = new Array<Promise<void>>();
            let oldValue : any;
            let newValue : any;

            let filters = { _id: { $in: doc[persistentMember] } };
            if (filters._id.$in && filters._id.$in.length > 0 )
                promises.push( session.listEntitiesByQuery(this.entityInfo, filters).then( 
                    entities => { 
                        baseEntity[accessorInfo.name] = entities; 
                        newValue = entities;
                    } 
                ));           
                            
            if (options && options.oldValue)
                promises.push( session.listEntitiesByQuery(this.entityInfo, { _id: { $in: options.oldValue } }).then( 
                    entities => { 
                        oldValue = entities;
                    } 
                ));

            if (promises && promises.length > 0)
                Promise
                    .all( promises )
                    .then( ()=> { resolve({ oldValue, newValue }) })
                    .catch( reject );
            else
                resolve({oldValue, newValue});
        });        
    }

    private castSingleInstanceInEntity(baseEntity : EMEntity, session : EMSession, accessorInfo : AccessorInfo, options?: { oldValue? : any } ) : Promise<{ oldValue? : any, newValue : any }>
    {
        return new Promise<{ oldValue? : any, newValue : any }>( (resolve, reject) => { 
            let doc = baseEntity.getDocument();
            let persistentMember = accessorInfo.persistentAlias || accessorInfo.name;
            let docData = doc[persistentMember];

            let promises = new Array<Promise<void>>();
            let oldValue : any;
            let newValue : any;

            if (docData) {
                let model = session.getModel(this.entityInfo.name);
                
                if(docData.id) { // Fix to avoid snapshot id change
                    docData._id = docData.id;
                    delete docData.id;
                } 

                promises.push( 
                    session
                        .activateEntityInstance<TEntity, TDocument>(this.entityInfo, new model(docData) as TDocument)
                        .then( entity => { 
                                baseEntity[accessorInfo.name] = entity; 
                                newValue = entity; 
                            })
                );
            }

            if (options && options.oldValue){
                let model = session.getModel(this.entityInfo.name);
                let document = new model(options.oldValue) as TDocument;

                promises.push( 
                    session
                        .activateEntityInstance<TEntity, TDocument>(this.entityInfo, document)
                        .then( entity => { oldValue = entity; }
                ));
            }
            
            if (promises && promises.length > 0)
                Promise
                    .all( promises )
                    .then( ()=> { resolve({ oldValue, newValue }) })
                    .catch( reject );
            else
                resolve({oldValue, newValue});
        });
    }

    private castArrayInstanceInEntity(entity : EMEntity, session : EMSession, accessorInfo : AccessorInfo, options?: { oldValue? : any } ) : Promise<{ oldValue? : any, newValue : any }>
    {
        return new Promise<{ oldValue? : any, newValue : any }>( (resolve, reject) => {
            let doc = entity.getDocument();
            let persistentMember = accessorInfo.persistentAlias || accessorInfo.name;
            let docsData = doc[persistentMember];
            
            let promises = new Array<Promise<void>>();
            let oldValue : any;
            let newValue : any;

            if (docsData && docsData.length > 0) {
                let model = session.getModel(this.entityInfo.name);
                newValue = new Array<TEntity>();

                for ( let i = 0; i < docsData.length ; i++) 
                    promises.push( 
                        session
                            .activateEntityInstance<TEntity, TDocument>(this.entityInfo, new model(docsData[i]) as TDocument)
                            .then( entity => newValue.push(entity)) 
                    );                
            }

            if (options && options.oldValue && options.oldValue.length > 0) {
                let model = session.getModel(this.entityInfo.name);
                oldValue = new Array<TEntity>();

                for ( let i = 0; i < docsData.length ; i++)
                    promises.push( 
                        session
                            .activateEntityInstance<TEntity, TDocument>(this.entityInfo, new model(docsData[i]) as TDocument)
                            .then( entity => oldValue.push(entity) ) 
                        );
            }

            if (promises && promises.length > 0)
                Promise
                    .all(promises)
                    .then(() => {
                        entity[accessorInfo.name] = newValue;
                        resolve({ oldValue, newValue })
                    })
                    .catch(reject);
            else
                resolve({ oldValue, newValue });
        });
    }


    //#endregion

    //#region Accessors

    get entityInfo()
    { return this._entityInfo; }

    get referenceType ( )
    { return this.bindingType == MemberBindingType.Reference ? 'string' : null; }

    get defaultSchema ()
    { return null; }

    get includeDuringSerialization() : boolean | string
    { return this._includeDuringSerialization; }
    
    get considerDuringDeserialization() : boolean | string 
    { return this._consideDuringDeserialization; }

    get defaultAccessor() : string
    {
        if (this._entityInfo && this._entityInfo.defaultAccessor)
            return this._entityInfo.defaultAccessor;

        if (this._entityInfo && this._entityInfo.getAccessors().find( a => a.name == 'name'))
            return 'name';

        return null;
    }


    //#endregion

}


class EMMemberTreeActivator extends MemberActivator 
{
    //#region Properties

    private _consideDuringDeserialization : boolean;
    private _includeDuringSerialization: boolean;
    private _entityInfo : EntityInfo;


    //#endregion

    //#region Methods

    constructor( bindingType : MemberBindingType, extendRoute : boolean );
    constructor( bindingType : MemberBindingType, extendRoute : boolean, options : { resourcePath? : string, includeDuringSerialization? : boolean, considerDuringDeserialization? : boolean } );
    constructor( bindingType : MemberBindingType, extendRoute : boolean, options? : { resourcePath? : string, includeDuringSerialization? : boolean, considerDuringDeserialization? : boolean } )
    {
        super(bindingType, extendRoute, options != null && options.resourcePath != null ? options.resourcePath : null);  

        if (options && options.considerDuringDeserialization != null)
            this._consideDuringDeserialization = options.considerDuringDeserialization;
        else 
            this._consideDuringDeserialization = bindingType == MemberBindingType.Reference ? true : false; 

        if (options && options.includeDuringSerialization != null)
            this._includeDuringSerialization = options.includeDuringSerialization;
        else
            this._includeDuringSerialization = true;
    }

    activateMember( entity : Entity, session : EMSession, accessorInfo : AccessorInfo, options?: { oldValue? : any } ) : Promise<{ oldValue? : any, newValue : any }>
    {
        if (!this._entityInfo)
            this._entityInfo = entity.entityInfo;

        switch (this.bindingType) {
            case MemberBindingType.Reference:
                if (accessorInfo.type == 'Array')
                    return this.loadArrayInstanceFromDB(entity as EMEntity, session, accessorInfo, options);
                else
                    return this.loadSingleInstanceFromDB(entity as EMEntity, session, accessorInfo, options);

            case MemberBindingType.Snapshot:
                if (accessorInfo.type == 'Array')
                    return this.castArrayInstanceInEntity(entity as EMEntity, session, accessorInfo, options);
                else
                    return this.castSingleInstanceInEntity(entity as EMEntity, session, accessorInfo, options);
        }        
    }                                                                                                                                                                                                                                    

    private loadSingleInstanceFromDB(baseEntity : EMEntity, session : EMSession, accessorInfo : AccessorInfo, options?: { oldValue? : any } ) : Promise<{ oldValue? : any, newValue : any }>
    {
        return new Promise<{ oldValue? : any, newValue : any }>( (resolve, reject) => {
            let doc = baseEntity.getDocument();
            let persistentMember = accessorInfo.persistentAlias || accessorInfo.name;
            let id : string = doc[persistentMember];

            let oldValue : any;
            let newValue : any;
            let promises = new Array<Promise<void>>();
            
            if (id)
                promises.push( session.findEntity(baseEntity.entityInfo, id).then( 
                    entity => { 
                        baseEntity[accessorInfo.name] = entity; 
                        newValue = entity; 
                    }
                ));           
                            
            if (options && options.oldValue)
                promises.push( session.findEntity(baseEntity.entityInfo, options.oldValue).then( 
                    entity => { 
                        oldValue = entity;  
                    } 
                ));

            Promise.all( promises ).then(
                ()=>{ resolve({ oldValue, newValue }) },
                error => reject(error)
            ).catch( error => reject(error) );

        });        
    }

    private loadArrayInstanceFromDB(baseEntity : EMEntity, session : EMSession, accessorInfo : AccessorInfo, options?: { oldValue? : any } ) : Promise<{ oldValue? : any, newValue : any }>
    {
        return new Promise<{ oldValue? : any, newValue : any }>( (resolve, reject) => {
            let doc = baseEntity.getDocument();
            let persistentMember = accessorInfo.persistentAlias || accessorInfo.name;
                
            let promises = new Array<Promise<void>>();
            let oldValue : any;
            let newValue : any;

            let filters = { _id: { $in: doc[persistentMember] } };
            if (filters._id.$in && filters._id.$in.length > 0 )
                promises.push( session.listEntitiesByQuery(baseEntity.entityInfo, filters).then( 
                    entities => { 
                        baseEntity[accessorInfo.name] = entities;
                        newValue = entities; 
                    } 
                ));           
                            
            if (options && options.oldValue)
                promises.push( session.listEntitiesByQuery(baseEntity.entityInfo, { _id: { $in: options.oldValue } }).then( 
                    entities => { 
                        oldValue = entities; 
                    } 
                ));

            Promise.all( promises ).then(
                ()=>{ resolve({ oldValue, newValue }) },
                error => reject(error)
            ).catch( error => reject(error) );
        });        
    }

    private castSingleInstanceInEntity(baseEntity : EMEntity, session : EMSession, accessorInfo : AccessorInfo, options?: { oldValue? : any } ) : Promise<{ oldValue? : any, newValue : any }>
    {
        return new Promise<{ oldValue? : any, newValue : any }>( (resolve, reject) => { 
            let doc = baseEntity.getDocument();
            let persistentMember = accessorInfo.persistentAlias || accessorInfo.name;
            let docData = doc[persistentMember];

            let promises = new Array<Promise<void>>();
            let oldValue : any;
            let newValue : any;

            if (docData)
            {
                let model = session.getModel(baseEntity.entityInfo.name);
                let document = new model(docData);

                promises.push( session.activateEntityInstance(baseEntity.entityInfo, document).then( 
                    entity => { 
                        baseEntity[accessorInfo.name] = entity; 
                        newValue = entity; 
                    }
                ));
            }

            if (options && options.oldValue)
            {
                let model = session.getModel(baseEntity.entityInfo.name);
                let document = new model(options.oldValue);

                promises.push( session.activateEntityInstance(baseEntity.entityInfo, document).then( 
                    entity => { 
                        oldValue = entity; 
                    }
                ));
            }
            
            Promise.all( promises ).then(
                ()=>{ resolve({ oldValue, newValue }) },
                error => reject(error)
            ).catch( error => reject(error) );
        });
    }

    private castArrayInstanceInEntity(baseEntity : EMEntity, session : EMSession, accessorInfo : AccessorInfo, options?: { oldValue? : any } ) : Promise<{ oldValue? : any, newValue : any }>
    {
        return new Promise<{ oldValue? : any, newValue : any }>( (resolve, reject) => {
            let doc = baseEntity.getDocument();
            let persistentMember = accessorInfo.persistentAlias || accessorInfo.name;
            let docsData = doc[persistentMember];
            
            let promises = new Array<Promise<void>>();
            let oldValue : any;
            let newValue : any;

            if (docsData && docsData.length > 0)
            {
                let model = session.getModel(baseEntity.entityInfo.name);
                newValue = new Array<EMEntity>();

                for ( let i = 0; i < docsData.length ; i++)
                {
                    let asModel = new model(docsData[i]);
                    promises.push( session.activateEntityInstance(baseEntity.entityInfo, asModel).then( entity => newValue.push(entity)) );
                }
            }

            if (options && options.oldValue && options.oldValue.length > 0)
            {
                let model = session.getModel(baseEntity.entityInfo.name);
                oldValue = new Array<EMEntity>();

                for ( let i = 0; i < docsData.length ; i++)
                {
                    let asModel = new model(docsData[i]);
                    promises.push( session.activateEntityInstance(baseEntity.entityInfo, asModel).then( entity => oldValue.push(entity) ) );
                }
            }

            Promise.all( promises ).then(
                ()=>{ 
                    baseEntity[accessorInfo.name] = newValue;
                    resolve({ oldValue, newValue }) 
                }
            ).catch( error => reject(error) );
        });
    }


    //#endregion

    //#region Accessors

    get referenceType ( )
    { return this.bindingType == MemberBindingType.Reference ? 'string' : null; }

    get defaultSchema ()
    { return null; }

    get includeDuringSerialization() : boolean
    { return this._includeDuringSerialization; }
    
    get considerDuringDeserialization() : boolean
    { return this._consideDuringDeserialization; }

    get defaultAccessor() : string
    {
        if (this._entityInfo  && this._entityInfo.defaultAccessor)
            return this._entityInfo.defaultAccessor;

        if (this._entityInfo && this._entityInfo.getAccessors().find( a => a.name == 'name'))
            return 'name';

        return null;
    }

    //#endregion

}


interface IChunkMember
{
    _id: string,
    name: string,
    fileExtension: string,
    size: number
}

export { EMMemberActivator, GfsMemberActivator, IChunkMember, EMMemberTreeActivator }