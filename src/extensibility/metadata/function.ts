import 'reflect-metadata';
import { EMEntity } from "../../express-mongoose/emEntity/emEntity";
import { EMEntityOperationMetaKey } from '../type-schema/constant';
import { EMEntityOperationMetadata } from '../type-schema/EMEntityOperationMetadata';

function addEntityMetadataOperation( entityObject : any, entityOperationMetadata : EMEntityOperationMetadata ) : void
{
    let metadataObject = Reflect.getMetadata(EMEntityOperationMetaKey, entityObject);

    if (!metadataObject)
        metadataObject = new Array<EMEntityOperationMetadata>();
    
    metadataObject.push(entityOperationMetadata);
    
    Reflect.defineMetadata(EMEntityOperationMetaKey, metadataObject, entityObject);
}

function getEntityOperationMetadata( entityObject : any ) : Array<EMEntityOperationMetadata>
{
    let metadataObject = Reflect.getMetadata(EMEntityOperationMetaKey, entityObject );

    if (metadataObject instanceof Array) { 
        let formattedMetadata = metadataObject.filter( mo => mo instanceof EMEntityOperationMetadata);
        if(formattedMetadata.length > 0)
            return formattedMetadata.map( mo => mo as EMEntityOperationMetadata );
        else
            return null;
    }
    else
        return null;
}

export {
    addEntityMetadataOperation,
    getEntityOperationMetadata    
}


















