const LifeCycleMappingMetaKey = Symbol("lifeCycleMappingMetaKey");
const LifeCycleValidationMetaKey = Symbol("lifeCycleValidationMetaKey");


interface LifeCycleMetaData<T> 
{
    statePropertyName: string;
    lifeCycleMap : Map<T,Array<T>>;
}

interface LifeCycleValidationData<T> 
{
    methodName: string;
    fromState: T;
    toState: T;
    invokeOnCall: boolean;
    invokeOnSave: boolean;
}

interface LifeCycleValidationParams<T> 
{ 
    from?: T | Array<T>; 
    to?: T | Array<T>;
    invokeOnCall?: boolean; 
    invokeOnSave?: boolean;
    propertyStateName? : string; 
}


export {
    LifeCycleMappingMetaKey,
    LifeCycleValidationMetaKey,
    LifeCycleMetaData,
    LifeCycleValidationData,
    LifeCycleValidationParams
}