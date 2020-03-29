import { EMEntity } from "../emEntity/emEntity"

import { 
    EMEntityOperationMetadata, 
    EMEntityMetaOperationType, 
    addEntityMetadataOperation 
} from "../../extensibility"

import { CounterModel, counterSchema, assertCounterModelDefinition, CounterOperation } from './counter';
import { EMServiceSession } from "../emServiceSession/emServiceSession";


function Secuence();
function Secuence(options : SecuenceOptions);
function Secuence(options? : SecuenceOptions)
{
    return function( target: any, key: string, descriptor: PropertyDescriptor) 
    {
        let setSecuenceOperation = new EMEntityOperationMetadata();
        setSecuenceOperation.addOperationType( EMEntityMetaOperationType.BeforeSave );
        setSecuenceOperation.operationMethod = entity => _setSecuence(entity, key, options);
        addEntityMetadataOperation(target, setSecuenceOperation);

        let rollbackSecuenceOperation = new EMEntityOperationMetadata();
        rollbackSecuenceOperation.addOperationType( EMEntityMetaOperationType.OnSaveException );
        rollbackSecuenceOperation.operationMethod = (entity, additionalData) => _rollbackSecuence(additionalData, entity, key, options);
        addEntityMetadataOperation(target, rollbackSecuenceOperation);

        assertCounterModelDefinition( options && options.counterModelName ? options.counterModelName : null );
    }
}


interface SecuenceOptions {
    map?: (counterValue: number, entity?: EMEntity) => string;
    prefix?: string,
    postfix?: string,
    separator?: string,
    valueLength?: number,
    counterModelName?: string
}

// Annotations Logic
// ===================================================================================================================================================================


function _setSecuence(entity : EMEntity, accessorName : string, options?: SecuenceOptions) : Promise<void> 
{
    if (entity.isNew) {
        return new Promise<void>((resolve,reject) => {
            options = options || {};
            let session = entity.session;
            let counterName = entity.entityInfo.name + '-' + accessorName + '-secuence'; 

            CounterOperation.getInstance(session,{ name: counterName }, { modelName: options.counterModelName }).then( counter => {
                let resolveWithNextValue = (validCounter: CounterModel) => 
                    CounterOperation.increaseInstance(session, validCounter._id, { modelName: options.counterModelName }).then( updatedCounter => {
                        entity[accessorName] = _secuenceSetup(entity, updatedCounter, options);
                        resolve();
                    }).catch(reject);
            
                if (!counter) {
                    let newCounter = { 
                        name: counterName,
                        entityName: entity.entityInfo.name,
                        type: 'secuence',
                        created: new Date(),
                        currentValue: 0
                    };
                    CounterOperation.createInstance(session, newCounter, { modelName: options.counterModelName }).then( result => resolveWithNextValue(result) ).catch( reject );
                }
                else 
                    resolveWithNextValue(counter);
            }).catch(reject);   
        });
    }
    else
        return Promise.resolve();
}

function _rollbackSecuence(additionalData: any, entity : EMEntity, accessorName : string, options? : SecuenceOptions ) : Promise<void> 
{
    if (entity.isNew) {
        return new Promise<void>((resolve,reject) => {
            options = options || {};
            let session = entity.session;
            let counterName = entity.entityInfo.name + '-' + accessorName + '-secuence';

            let manageRollbackException = exception => {
                /**
                 * TO DO: Manage rollback exceptions withount stop transaction
                 */
                resolve();
            };

            CounterOperation.getInstance(session,{ name: counterName }, { modelName: options.counterModelName }).then( counter => {        
                if (counter)
                    CounterOperation.increaseInstance(session, counter._id, { quantity: -1, modelName: options.counterModelName }).then( updatedCounter => {
                        resolve();
                    }).catch(manageRollbackException);
                else  
                    resolve(); //No rollback needed 
            }).catch(manageRollbackException);
        });
    }
    else
        return Promise.resolve();
}

function _secuenceSetup( entity: EMEntity, counter : CounterModel,options : SecuenceOptions) : string 
{
    // Map function overrides complete logic
    if (options && options.map) 
        return options.map(counter.currentValue, entity);
    
    let finalValue = counter.currentValue.toString();
    let separator = options && options.separator ? options.separator : '-';
    let valueLength = options && options.valueLength != null ? options.valueLength : 4;
    
    while( finalValue.length < valueLength) 
        finalValue = '0' + finalValue;
    
    if (options && options.prefix)
        finalValue = options.prefix + separator + finalValue;

    if (options && options.postfix)
        finalValue = finalValue + separator + options.postfix;

    return finalValue;
}


export {
    Secuence
}

