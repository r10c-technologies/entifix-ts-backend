import { EntityInfo, MemberActivator, AccessorInfo, MemberBindingType } from '../../hc-core/hcMetaData/hcMetaData';
import { Entity } from '../../hc-core/hcEntity/hcEntity';
import { EMEntity, EntityDocument } from '../emEntity/emEntity';
import { EMSession } from '../emSession/emSession';


class EMMemberActivator<TEntity extends EMEntity, TDocument extends EntityDocument> extends MemberActivator 
{
    //#region Properties

    private _bindingType : MemberBindingType;
    private _extendRoute : boolean;
    private _resourcePath : string;
    
    //#endregion

    //#region Methods

    constructor(entityInfo : EntityInfo, bindingType : MemberBindingType, extendRoute : boolean );
    constructor(entityInfo : EntityInfo, bindingType : MemberBindingType, extendRoute : boolean, options : { resourcePath? : string } );
    constructor(entityInfo : EntityInfo, bindingType : MemberBindingType, extendRoute : boolean, options? : { resourcePath? : string } )
    {
        super(entityInfo);

        this._bindingType = bindingType;
        this._extendRoute = extendRoute;

        this._resourcePath = options != null && options.resourcePath != null ? options.resourcePath : entityInfo.name.toLowerCase();
    }

    activateMember( entity : Entity, session : EMSession, accessorInfo : AccessorInfo, options?: { oldValue? : any } ) : Promise<{ oldValue? : any, newValue : any }>
    {
        switch (this._bindingType) 
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
                promises.push( session.listEntitiesByQuery(this.entityInfo, filters).then( 
                    entities => { 
                        baseEntity[accessorInfo.name] = entities; 
                    } 
                ));           
                            
            if (options && options.oldValue)
                promises.push( session.listEntitiesByQuery(this.entityInfo, { _id: { $in: options.oldValue } }).then( 
                    entities => { 
                        baseEntity[accessorInfo.name] = entities; 
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
                let model = session.getModel(this.entityInfo.name);
                let document = new model(docData) as TDocument;

                promises.push( session.activateEntityInstance<TEntity, TDocument>(this.entityInfo, document).then( 
                    entity => { 
                        baseEntity[accessorInfo.name] = entity; 
                        newValue = entity; 
                    }
                ));
            }

            if (options && options.oldValue)
            {
                let model = session.getModel(this.entityInfo.name);
                let document = new model(options.oldValue) as TDocument;

                promises.push( session.activateEntityInstance<TEntity, TDocument>(this.entityInfo, document).then( 
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

    private castArrayInstanceInEntity(entity : EMEntity, session : EMSession, accessorInfo : AccessorInfo, options?: { oldValue? : any } ) : Promise<{ oldValue? : any, newValue : any }>
    {
        return new Promise<{ oldValue? : any, newValue : any }>( (resolve, reject) => {
            let doc = entity.getDocument();
            let persistentMember = accessorInfo.persistentAlias || accessorInfo.name;
            let docsData = doc[persistentMember];
            
            let promises = new Array<Promise<void>>();
            let oldValue : any;
            let newValue : any;

            if (docsData && docsData.length > 0)
            {
                let model = session.getModel(this.entityInfo.name);
                let promises = new Array<Promise<void>>();
                newValue = new Array<TEntity>();

                for ( let i = 0; i < docsData.length ; i++)
                {
                    let asModel = new model(docsData[i]) as TDocument;
                    promises.push( session.activateEntityInstance<TEntity, TDocument>(this.entityInfo, asModel).then( 
                        entity => { 
                            newValue.push(entity) 
                        }
                    ));
                }
            }

            if (options && options.oldValue && options.oldValue.length > 0)
            {
                let model = session.getModel(this.entityInfo.name);
                let promises = new Array<Promise<void>>();
                oldValue = new Array<TEntity>();

                for ( let i = 0; i < docsData.length ; i++)
                {
                    let asModel = new model(docsData[i]) as TDocument;
                    promises.push( session.activateEntityInstance<TEntity, TDocument>(this.entityInfo, asModel).then( 
                        entity => { 
                            oldValue.push(entity) 
                        }
                    ));
                }
            }

            Promise.all( promises ).then(
                ()=>{ 
                    entity[accessorInfo.name] = newValue;
                    resolve({ oldValue, newValue }) 
                },
                error => reject(error)
            ).catch( error => reject(error) );
        });
    }

    //#endregion

    //#region Accessors

    get bindingType ()
    { return this._bindingType; }

    get extendRoute ()
    { return this._extendRoute; }

    get resourcePath ()
    { return this._resourcePath || this.entityInfo.name.toLowerCase(); }

    get referenceType ( )
    { return this._bindingType == MemberBindingType.Reference ? 'string' : null; }

    //#endregion


}

export { EMMemberActivator }