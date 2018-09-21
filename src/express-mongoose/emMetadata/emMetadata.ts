import { EntityInfo, MemberActivator, AccessorInfo } from '../../hc-core/hcMetaData/hcMetaData';
import { Entity } from '../../hc-core/hcEntity/hcEntity';
import { EMEntity, EntityDocument } from '../emEntity/emEntity';
import { EMSession } from '../emSession/emSession';


class EMMemberActivator<TEntity extends EMEntity, TDocument extends EntityDocument> extends MemberActivator 
{
    //#region Properties

    //#endregion

    //#region Methods

    activateMember( entity : Entity, session : EMSession, accessorInfo : AccessorInfo ) : Promise<void>
    {
        let doc = (entity as EMEntity).getDocument();
        let persistentMember = accessorInfo.persistentAlias || accessorInfo.name;
        let id : string = doc[persistentMember];
        return session.findEntity<TEntity, TDocument>(this.entityInfo, id).then( entityMemberInstance => { entity[accessorInfo.name] = entityMemberInstance } );
    }

    //#endregion

    //#region Accessors

    
    //#endregion


}

export { EMMemberActivator }