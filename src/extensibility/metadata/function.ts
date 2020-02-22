import 'reflect-metadata';
import { EMEntity } from "../../express-mongoose/emEntity/emEntity";
import { EMEntityOperationMetaKey } from '../type-schema/constant';
import { EMEntityOperationMetadata } from '../type-schema/EMEntityOperationMetadata';

function addEntityMetadataOperation( entityConstructor : { new( ) : EMEntity }, entityOperationMetadata : EMEntityOperationMetadata )
{

}

function getEntityOperationMetadata( entityConstructor : { new() : EMEntity  } )
{
    let metadataObject = Reflect.getMetadata(EMEntityOperationMetaKey, entityConstructor);

    if (metadataObject instanceof EMEntityOperationMetadata) 
        return metadataObject as EMEntityOperationMetadata;
    else
        return null;
}

export {
    addEntityMetadataOperation,
    getEntityOperationMetadata    
}


















