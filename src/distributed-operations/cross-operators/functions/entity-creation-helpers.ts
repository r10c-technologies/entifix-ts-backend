// import { EMEntity, EntityDocument } from "../../../express-mongoose/emEntity/emEntity";
// import { EMSession } from "../../../express-mongoose/emSession/emSession";
// import { EntityInfo } from "../../../hc-core/hcMetaData/hcMetaData";
// import { CrossOperatorError } from '../entities/CrossOperatorError';


// async function createEntityFromOperator<TEntity extends EMEntity, TDocument extends EntityDocument>(session : EMSession, info : EntityInfo,  operatorData : any) : Promise<TEntity | CrossOperatorError>
// {
//     let operator = identifyCreateOperation( operatorData );

//     if (operator) {
//         switch( operator.value ) {
//             case CreateOperation.newInstance:

//                 let accessors = info.getAccessors();
//                 let inconsistencies : any;
//                 let newInstance : TEntity;

//                 for (let property in operator.data) {
//                     let currentAccessor = accessors.find( a => a.name == property);                    
//                     if (currentAccessor) {
//                         if (!newInstance)
//                             newInstance = await session.activateEntityInstance<TEntity, TDocument>(info, null);

//                         newInstance[property] = operator.data[property];
//                     }
//                     else {
//                         if (!inconsistencies)
//                             inconsistencies = {};
//                         inconsistencies[property] = operator.data[property];
//                     }
//                 }


//                 if (inconsistencies){
//                     return new CrossOperatorError( `Inconsistent data for create entity: [${info.name}]`, inconsistencies );
//                 }
//                 else 
//                     return newInstance;

//                 break;
//         }
//     }

//     return null;
// }

// function identifyCreateOperation( operatorData : any ) : { value : CreateOperation, data : any }
// {
//     if (operatorData)
//     {
//         if (operatorData.$newInstance) 
//             return { value: CreateOperation.newInstance, data: operatorData.$newInstance }; 
    
//     }

//     return null;
// }


// export { createEntityFromOperator }





