import { EntityInfo, MemberActivator, AccessorInfo } from '../../hc-core/hcMetaData/hcMetaData';
import { Entity } from '../../hc-core/hcEntity/hcEntity';
import { EMEntity, EntityDocument } from '../emEntity/emEntity';
import { EMSession } from '../emSession/emSession';
import { filter } from 'bluebird';


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
        this._resourcePath = options != null && options.resourcePath != null ? options.resourcePath : null;
    }

    activateMember( entity : Entity, session : EMSession, accessorInfo : AccessorInfo ) : Promise<void>
    {
        switch (this._bindingType) 
        {
            case MemberBindingType.Reference:
                if (entity[accessorInfo.name] instanceof Array)
                    return this.loadArrayInstanceFromDB(entity as EMEntity, session, accessorInfo);
                else
                    return this.loadSingleInstanceFromDB(entity as EMEntity, session, accessorInfo);

            case MemberBindingType.Snapshot:
                if (entity[accessorInfo.name] instanceof Array)
                    return this.castArrayInstanceInEntity(entity as EMEntity, session, accessorInfo);
                else
                    return this.castSingleInstanceInEntity(entity as EMEntity, session, accessorInfo);
        }        
    }

    private loadSingleInstanceFromDB(entity : EMEntity, session : EMSession, accessorInfo : AccessorInfo) : Promise<void>
    {
        let doc = entity.getDocument();
        let persistentMember = accessorInfo.persistentAlias || accessorInfo.name;
        let id : string = doc[persistentMember];

        return session.findEntity<TEntity, TDocument>(this.entityInfo, id).then( entityMemberInstance => { entity[accessorInfo.name] = entityMemberInstance } );
    }

    private loadArrayInstanceFromDB(entity : EMEntity, session : EMSession, accessorInfo : AccessorInfo) : Promise<void>
    {
        let doc = entity.getDocument();
        let persistentMember = accessorInfo.persistentAlias || accessorInfo.name;
        let filters = { _id: { $in: doc[persistentMember] } };
            
        return session.listEntitiesByQuery(this.entityInfo, filters).then( entities => { entity[accessorInfo.name] = entities } );
    }

    private castSingleInstanceInEntity(entity : EMEntity, session : EMSession, accessorInfo : AccessorInfo) : Promise<void>
    {
        let doc = entity.getDocument();
        let persistentMember = accessorInfo.persistentAlias || accessorInfo.name;
        let docData = doc[persistentMember];
        let model = session.getModel(this.entityInfo.name);
        let document = new model(docData) as TDocument;

        return session.activateEntityInstance<TEntity, TDocument>(this.entityInfo, document).then( entity => { entity[accessorInfo.name] = entity });
    }

    private castArrayInstanceInEntity(entity : EMEntity, session : EMSession, accessorInfo : AccessorInfo) : Promise<void>
    {
        return new Promise<void>( (resolve, reject) => {
            let doc = entity.getDocument();
            let persistentMember = accessorInfo.persistentAlias || accessorInfo.name;
            let docsData = doc[persistentMember];
            let model = session.getModel(this.entityInfo.name);
            let promises = new Array<Promise<void>>();
            let entities = new Array<TEntity>();

            docsData.foreach( d => promises.push( session.activateEntityInstance<TEntity, TDocument>(this.entityInfo, new model(d) as TDocument).then( entity => { entities.push(entity) } ) ) );

            Promise.all(promises).then(
                () => resolve(),
                error => reject(error)
            );
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

    //#endregion


}

enum MemberBindingType
{
    Reference = 1,
    Snapshot = 2
}
export {MemberBindingType, EMMemberActivator }