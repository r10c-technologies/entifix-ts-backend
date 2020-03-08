import 'reflect-metadata';
import { EMEntity } from "../../express-mongoose/emEntity/emEntity";
import { EMEntityOperationMetaKey } from '../type-schema/constant';
import { EMEntityOperationMetadata } from '../type-schema/EMEntityOperationMetadata';

function addEntityMetadataOperation( entityConstructor : { new( ) : EMEntity }, entityOperationMetadata : EMEntityOperationMetadata ) : void
{
    let metadataObject = Reflect.getMetadata(EMEntityOperationMetaKey, entityOperationMetadata);

    if (!metadataObject)
        metadataObject = new Array<EMEntityOperationMetadata>();
    
    metadataObject.push(entityOperationMetadata);
    
    Reflect.defineMetadata(EMEntityOperationMetaKey, metadataObject, entityConstructor);
}

function getEntityOperationMetadata( entityConstructor : { new() : EMEntity  } ) : Array<EMEntityOperationMetadata>
{
    let metadataObject = Reflect.getMetadata(EMEntityOperationMetaKey, entityConstructor);

    if (metadataObject instanceof Array) { 
        let formattedMetadata = metadataObject.filter( mo => mo instanceof EMEntityOperationMetadata);
        if(formattedMetadata.length > 0)
            return formattedMetadata;
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


















