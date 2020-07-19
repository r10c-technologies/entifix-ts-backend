import { EMEntityMetaOperationType } from './enumeration'
import { EntityMovementFlow } from '../../hc-core/hcEntity/hcEntity'
import { EMEntity } from '../../express-mongoose/emEntity/emEntity';
import { getEntityOperationMetadata } from '../metadata/function';
import { EntifixLogger } from '../../app-utilities/logger/entifixLogger';

class EMEntityOperationMetadata 
{
    //#region Properties

    private _operationTypes: Array<EMEntityMetaOperationType>;
    private _operationMethod: (entity : EMEntity, additionalData? : any) => void | Promise<void> | EntityMovementFlow | Promise<EntityMovementFlow>;
    private _data: any;
    private _name: string;

    //#endregion

    //#region Methods

    constructor(name : string) {
        this._name = name;
    }

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
        EntifixLogger.trace({
            message: `Perform single extesion operator [${this.name}] for entity [${entity.entityInfo.name}(${entity._id.toString()})]`, 
            developer:'herber230', systemOwner: entity?.session?.privateUserData?.systemOwnerSelected, 
            origin: { file: 'EMEntityOperationMetadata', method: 'public: perform' } 
        });

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

    get name()
    { return this._name; }


    //#endregion

    //#region Static

    public static performExtensionOperators(entity : EMEntity, operationType : EMEntityMetaOperationType | Array<EMEntityMetaOperationType>, additionalData? : any ) : Promise<EntityMovementFlow>
    {
        EntifixLogger.trace({
            message: `Perform extension operators for entity [${entity.entityInfo.name}(${entity._id.toString()})]`, 
            developer:'herber230', systemOwner: entity?.session?.privateUserData?.systemOwnerSelected, 
            origin: { file: 'EMEntityOperationMetadata', method: 'public-static: performExtensionOperators' } 
        });

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
                        if (eo && (eo as EntityMovementFlow).continue != null)
                            return eo as EntityMovementFlow;
                        else
                            return null;
                    });
                else
                    syncResults = [];

                let resolvePromise = (results : Array<void | EntityMovementFlow>) => 
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

                let asyncResults = allResults.filter( eo => eo instanceof Promise) as Array<Promise<void | EntityMovementFlow>>;
                if (asyncResults && asyncResults.length > 0)
                    Promise.all(asyncResults).then( r => resolvePromise(syncResults.concat(r)) ).catch( reject );
                else
                    resolvePromise(syncResults);

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

