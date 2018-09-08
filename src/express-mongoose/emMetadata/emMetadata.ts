import { EntityInfo, MemberActivator, AccessorInfo } from '../../hc-core/hcMetaData/hcMetaData';
import { Entity } from '../../hc-core/hcEntity/hcEntity';
import { EMEntity, EntityDocument } from '../emEntity/emEntity';
import { EMSession } from '../emSession/emSession';


class EMMemberActivator<TEntity extends EMEntity, TDocument extends EntityDocument> extends MemberActivator 
{
    //#region Properties

    //#endregion

    //#region Methods

    activateMember( entity : Entity, session : EMSession, memberName : string ) : Promise<void>
    {
        let id : string = entity[memberName];
        return session.findEntity<TEntity, TDocument>(this.entityInfo, id).then( entityMemberInstance => { entity[memberName] = entityMemberInstance } );
    }

    //#endregion

    //#region Accessors

    
    //#endregion


}

export { EMMemberActivator }