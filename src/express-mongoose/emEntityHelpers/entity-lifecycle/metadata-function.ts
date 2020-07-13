
import 'reflect-metadata';
import { LifeCycleMappingMetaKey, LifeCycleMetaData, LifeCycleValidationMetaKey, LifeCycleValidationData } from "./metadata-model";


function setLifecycleMetadata<T>( target : any, lifeCycleMetadata : LifeCycleMetaData<T> ) : void
{
    Reflect.defineMetadata(LifeCycleMappingMetaKey, lifeCycleMetadata, target);  
}

function getLifecycleMetadata<T>( target : any ) : LifeCycleMetaData<T>
{
    return Reflect.getMetadata(LifeCycleMappingMetaKey, target);
}

function setLifecycleValidationMetadata<T>( target : any, lifeCycleMetadata : Array<LifeCycleValidationData<T>> ) : void
{
    Reflect.defineMetadata(LifeCycleValidationMetaKey, lifeCycleMetadata, target);  
}

function getLifecycleValidationMetadata<T>( target : any ) : Array<LifeCycleValidationData<T>>
{
    return Reflect.getMetadata(LifeCycleValidationMetaKey, target);
}

export {
    setLifecycleMetadata,
    getLifecycleMetadata,
    setLifecycleValidationMetadata,
    getLifecycleValidationMetadata
}
