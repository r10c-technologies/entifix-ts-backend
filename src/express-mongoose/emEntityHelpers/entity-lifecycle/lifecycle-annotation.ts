import { 
    MethodInfo, 
    EntityInfo, 
    definedParamKey,
    DefinedMetaParam
} from "../../../hc-core/hcMetaData/hcMetaData";

import { LifeCycleValidationData, LifeCycleValidationParams, LifeCycleMetaData } from "./metadata-model";
import { addEntityMetadataOperation, EMEntityOperationMetadata, EMEntityMetaOperationType } from "../../../extensibility";
import { EMEntity } from "../../emEntity/emEntity";
import { EntityMovementFlow } from "../../../hc-core/hcEntity/hcEntity";
import { EMServiceSession } from "../../emServiceSession/emServiceSession";
import { AMQPEventManager, ExchangeDescription, ExchangeType } from "../../../amqp-events/amqp-event-manager/AMQPEventManager";
import { AMQPCustomEvent } from "../../../amqp-events/amqp-custom-event/AMQPCustomEvent";
import { setLifecycleMetadata, getLifecycleValidationMetadata } from "./metadata-function";



function StateParam( )
{
    return function(target: Object, propertyKey: string | symbol, parameterIndex: number) 
    {
        let definedParameters: Array<DefinedMetaParam> = Reflect.getOwnMetadata(definedParamKey, target, propertyKey) || new Array<DefinedMetaParam>();
        definedParameters.push({ name: 'state', index: parameterIndex, special: true });
        Reflect.defineMetadata(definedParamKey, definedParameters, target, propertyKey);
    }
}


function LifeCycleSetter<TState>( params: { mapping : Map<TState, Array<TState>> } );
function LifeCycleSetter<TState>( params: { mapping : Map<TState, Array<TState>>, eventName?: string, returnActionData? : boolean, statePropertyName?: string } );
function LifeCycleSetter<TState>( params: { mapping : Map<TState, Array<TState>>, eventName?: string, returnActionData? : boolean, statePropertyName?: string } )
{
    return function(target: any, memberName: string, descriptor: TypedPropertyDescriptor<Function>)
    {
        let entityInfo : EntityInfo;
        if (!target.entityInfo)
            target.entityInfo = new EntityInfo(target.constructor.name);
        entityInfo = target.entityInfo;

        let methodInfo = new MethodInfo();
        methodInfo.name = memberName;
        methodInfo.className = target.constructor.name;
        methodInfo.parameters = Reflect.getOwnMetadata( definedParamKey, target, memberName );
        methodInfo.returnActionData = params.returnActionData;
        entityInfo.addMethodInfo(methodInfo);
        let statePropertyName = params.statePropertyName || 'state';
      
        //Set metadata
        let lifecycleMetadata : LifeCycleMetaData<TState> = {
            statePropertyName,
            lifeCycleMap: params.mapping
        };
        setLifecycleMetadata(target, lifecycleMetadata );
        
        //Override method behavior
        descriptor.value = _overrideLifeCycleSet(methodInfo, descriptor.value, statePropertyName );
        
        //Event handling
        if (!params.eventName) {
            // For more cusomizable event parameters, the best option is to create an individual AMQP event
            methodInfo.eventName = methodInfo.className + (memberName.charAt(0).toUpperCase() + memberName.slice(1)) + 'CustomEvent'; 
            let rountingKey = `action.${methodInfo.className}.${memberName}`;
            _assertActionDefinition(methodInfo.eventName, rountingKey);
        }
        else
            methodInfo.eventName = params.eventName;
    }
}


function LifeCycleValidation<T>();
function LifeCycleValidation<T>( params: LifeCycleValidationParams<T> );
function LifeCycleValidation<T>( params?: LifeCycleValidationParams<T> ) 
{
    return function(target: any, memberName: string, descriptor: TypedPropertyDescriptor<Function>)
    {
        let invokeOnCall = params != null && params.invokeOnCall != null ? params.invokeOnCall : true;
        let invokeOnSave = params != null && params.invokeOnCall != null ? params.invokeOnSave : false; 

        let metadata = getLifecycleValidationMetadata<T>(target);

        if (!metadata)
            metadata = new Array<LifeCycleValidationData<T>>()

        let operationTypes = new Array<EMEntityMetaOperationType>();
        if (invokeOnCall)
            operationTypes.push(EMEntityMetaOperationType.OnLifeCycleActionCall);
        if (invokeOnSave)
            operationTypes.push(EMEntityMetaOperationType.BeforeSave);

        addEntityMetadataOperation(target, new EMEntityOperationMetadata(`LifeCycleValidationOperation->${memberName}`)
            .addOperationType(operationTypes)
            .setOperationMethod((entity, aditionalData) => _runLifeCycleValidation(entity, descriptor, params, aditionalData )) 
        );
    }
}


// Annotations Logic
// ===================================================================================================================================================================



function _satisfiesStateCondition<T>(condition : T | Array<T>, state : T) : boolean
{
    if (condition) {
        if (condition instanceof Array) 
            return condition.find( c => c == state) != null
        else { 
            if ((condition as any) == '*')
                return true;
            else
                return condition == state;
        } 
    }
    else
        return false;
}


function _runLifeCycleValidation<T>( entity: EMEntity, descriptor : TypedPropertyDescriptor<Function>, params : LifeCycleValidationParams<T>, aditionalData: any) 
{
    //Config values
    let entityInAditionalData = ['$entity', '$previousEntity', '$previous', 'entity', 'previousEntity', 'previous'];
    
    params = params || {};
    let propertyStateName = params.propertyStateName || 'state';
    let fromState : T;
    let toState = entity[propertyStateName];

    for (let entityCandidate of entityInAditionalData)
        if (aditionalData[entityCandidate] && aditionalData[entityCandidate][propertyStateName]) {
            fromState = aditionalData[entityCandidate][propertyStateName];
            break;
        }

    let includesFromState = _satisfiesStateCondition(params.from, fromState);
    let includesToState = _satisfiesStateCondition(params.to, toState);

    if (includesFromState || includesToState)
        return descriptor.value.apply(entity);    
}


function _overrideLifeCycleSet(methodInfo : MethodInfo, originalMethod : Function, statePropertyName : string) {
    return function() {
        let params = new Array<any>();
        let userParamArray = new Array<{key,value}>();

        if (arguments && arguments[0])
            for (let argument of arguments[0]) {
                if ( (argument as Object).hasOwnProperty('key') && (argument as Object).hasOwnProperty('value') )
                    userParamArray.push( { key: argument.key, value: argument.value } );
            }
            
        if (methodInfo.parameters && methodInfo.parameters.length > 0) {
            let limit = Math.max( ...methodInfo.parameters.map( dp => dp.index ) );
            for ( let i = 0; i <= limit; i++ )
            {
                let defParam = methodInfo.parameters.find( dp => dp.index == i );
                if (defParam) {
                    let arg : {key,value};
                        arg = userParamArray.find( a => a.key == defParam.name );
                        
                    params.push(arg ? arg.value : null);
                }
                else
                    params.push(null);
            }
        }
        
        let that = this;
        return new Promise<EntityMovementFlow>((resolve,reject)=> {
            let entity : EMEntity = that;
            let aditionalData : any;
            if (entity.instancedChanges && entity.instancedChanges.length > 0) {
                let change = entity.instancedChanges.find( ic => ic.property == statePropertyName);
                if (change)
                    aditionalData = { [statePropertyName]: change.oldValue };    
            }
            if (!aditionalData || !aditionalData[statePropertyName])
                aditionalData = { [statePropertyName]: entity[statePropertyName] };

            EMEntityOperationMetadata
                .performExtensionOperators(this, EMEntityMetaOperationType.OnLifeCycleActionCall, aditionalData)
                .then( operationResult => {
                        if (operationResult.continue)
                            resolve(originalMethod.apply(this, params));
                        else
                            resolve(operationResult);
                    })
                .catch(reject);
        });
    };
}

function _assertActionDefinition(eventName: string, eventRoutingKey: string)
{
    EMServiceSession.on('eventManagerStarted', (eventManager : AMQPEventManager) => {
        let customEventExchangeDescription : ExchangeDescription = {
            name: 'entity_events', 
            type: ExchangeType.topic, 
            options: { durable: true } 
        };

        let customEvent = new AMQPCustomEvent(eventManager, eventName, eventRoutingKey, customEventExchangeDescription);
        eventManager.registerEvent(customEvent);
    });
}

// ===================================================================================================================================================================
// Annotations Logic


export {
    StateParam,
    LifeCycleSetter,
    LifeCycleValidation
}


