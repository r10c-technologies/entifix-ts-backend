import { EMEntityMetaOperationType } from './enumeration'
import { EntityMovementFlow } from '../../hc-core/hcEntity/hcEntity'
import { EMEntity } from '../../express-mongoose/emEntity/emEntity';
import { getEntityOperationMetadata } from '../metadata/function';

class EMEntityOperationMetadata 
{
    //#region Properties

    private _operationTypes: Array<EMEntityMetaOperationType>;
    private _operationMethod: (entity : EMEntity, additionalData? : any) => void | Promise<void> | EntityMovementFlow | Promise<EntityMovementFlow>;
    private _data: any;

    //#endregion

    //#region Methods

    constructor() { }

    addOperationType(operationType : EMEntityMetaOperationType | Array<EMEntityMetaOperationType>) : EMEntityOperationMetadata 
    {
        if (operationType) {
            if (!this._operationTypes)
                this._operationTypes = new Array<EMEntityMetaOperationType>();

            if (operationType instanceof Array)
                this._operationTypes = this._operationTypes.concat(operationType);
            else
                this._operationTypes.push(operationType);
        }

        return this;
    }

    applyForOperation(operationType : EMEntityMetaOperationType | Array<EMEntityMetaOperationType>) : boolean
    {
        if (!this._operationTypes)
            return false;
            
        let check = opType => opType != null ? this._operationTypes.find( ot => ot == opType) != null : false;
        
        if (operationType instanceof Array) 
            return operationType.map( ot => check(ot) ).reduce( (prev, curr) => prev && curr, true );
        else
            return check(operationType);
    }

    perform( entity : EMEntity, additionalData : any) 
    {
        if (!entity)
            throw new Error('The entity for operation is null');

        if (!this._operationMethod)
            throw new Error('There is no method setted for the Entity Operation');

         return this._operationMethod(entity, additionalData);
    }

    //Fluid Setter method
    setOperationMethod(opMethod : (entity : EMEntity, additionalData? : any) => void | Promise<void> | EntityMovementFlow | Promise<EntityMovementFlow>) {
        this._operationMethod = opMethod;
        return this;
    }

    //#endregion

    //#region Accessors

    get operationTypes()
    { return this._operationTypes; }
    set operationTypes(value)
    { this._operationTypes = value; }

    get operationMethod()
    { return this._operationMethod; }
    set operationMethod(value)
    { this._operationMethod = value; }

    get data()
    { return this._data; }
    set data(value)
    { this._data = value; }

    //#endregion

    //#region Static

    public static performExtensionOperators(entity : EMEntity, operationType : EMEntityMetaOperationType | Array<EMEntityMetaOperationType>, additionalData? : any ) : Promise<EntityMovementFlow>
    {
        return new Promise((resolve,reject)=> {
            let entityOperators = getEntityOperationMetadata(entity);

            if (entityOperators && entityOperators.length > 0) 
                entityOperators = entityOperators.filter( eo => eo.applyForOperation(operationType) );
                
            if (entityOperators && entityOperators.length > 0) {
                // Exectuion of operations
                let allResults = entityOperators.map( eo => eo.perform(entity, additionalData) );
            
                let syncResults  = allResults.filter( eo => !(eo instanceof Promise)) as Array<void | EntityMovementFlow>;

                if (syncResults && syncResults.length > 0)
                    syncResults = syncResults.map(eo => {
                        if ((eo as EntityMovementFlow).continue != null)
                            return eo as EntityMovementFlow;
                        else
                            return null;
                    });
                else
                    syncResults = [];

                let asyncResults = allResults.filter( eo => eo instanceof Promise) as Array<Promise<void | EntityMovementFlow>>;
                if (asyncResults && asyncResults.length > 0)
                    Promise.all(asyncResults).then( r => resolvePromise(syncResults.concat(r)) ).catch( reject );
                else
                    resolvePromise(syncResults);

                var resolvePromise = (results : Array<void | EntityMovementFlow>) => 
                {    
                    let affectResults = results.filter( r => r != null) as Array<EntityMovementFlow>;
                    if (affectResults && affectResults.length > 0 ){
                        let concatMessages = (prev : string, curr : string) =>  curr != null ? (prev || '') + ' - ' + curr : prev;
                        let finalEMF = affectResults.reduce( (prev, curr) => { return {continue: prev.continue && curr.continue, message: concatMessages(prev.message, curr.message)}; }, { continue: true } );
                        resolve( finalEMF );
                    }
                    else
                        resolve({continue: true});
                };
            }
            else
                resolve({ continue: true })
        });
    }

    //#endregion
}

export {
    EMEntityOperationMetadata
}

