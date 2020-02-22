import { RedisClient } from "redis";
import { EMEntityMultiKey, IEntityKey } from "../../../express-mongoose/emEntityMultiKey/emEntityMultiKey";


function lockEntityMultikey ( entity : EMEntityMultiKey ) : Promise<void>;
function lockEntityMultikey ( entity : EMEntityMultiKey, options: { customOperationReference?: string } ) : Promise<void>;
function lockEntityMultikey ( entity : EMEntityMultiKey, options?: { customOperationReference?: string } ) : Promise<void>
{
    if (entity) {
         return new Promise<void>((resolve,reject) => {
            let session = entity.session;
            let cacheClient = session.serviceSession.authCacheClient;
            let entityKeyToString = ( ek : IEntityKey) => ek.serviceName + '-' + ek.entityName + '-' + ek.value;
            
            let customOperationReference = options && options.customOperationReference ? options.customOperationReference : 'Lock by EntityMultiKey generic operation'; 

            let entityKeys : Array<IEntityKey> = [ entity.key ];
            if (entity.alternativeKeys && entity.alternativeKeys.length > 0)
                entityKeys = entityKeys.concat( entity.alternativeKeys );

            Promise.all(entityKeys.map( ek => setBlocking(cacheClient, { 
                blockingKey: entityKeyToString(ek),
                serviceOrigin: session.serviceSession.serviceName,
                entityOrigin: entity.entityInfo.name,
                entityInstanceOrigin: entity._id.toString(),
                start: new Date(),
                customOperationReference
            }))).then(() => resolve()).catch( e => { entityKeys.forEach( ek => removeBlocking(cacheClient, entityKeyToString(ek))); reject(e); });
         });
    }
    else
        return Promise.resolve();
}


function unlockEntityMultikey( entity : EMEntityMultiKey ) : Promise<void>
{
    if (entity) {
        return new Promise<void>((resolve, reject) => {
            let session = entity.session;
            let cacheClient = session.serviceSession.authCacheClient;
            let entityKeyToString = ( ek : IEntityKey) => ek.serviceName + '-' + ek.entityName + '-' + ek.value;
            
            let entityKeys : Array<IEntityKey> = [ entity.key ];
            if (entity.alternativeKeys && entity.alternativeKeys.length > 0)
                entityKeys = entityKeys.concat( entity.alternativeKeys );

            Promise.all(entityKeys.map(ek => removeBlocking(cacheClient, entityKeyToString(ek)))).then( () => resolve()).catch( reject );
        });
    }
    else
        return Promise.resolve();
}


function setBlocking(cacheClient : RedisClient, blockingInfo : BlockingInfo) : Promise<void>;
function setBlocking(cacheClient : RedisClient, blockingInfo : BlockingInfo, options: { expireSeconds?: number}) : Promise<void>;
function setBlocking(cacheClient : RedisClient, blockingInfo : BlockingInfo, options?: { expireSeconds?: number}) : Promise<void>
{
    if (blockingInfo) 
        return new Promise<void>( (resolve,reject) => {
            let setParams = [];
            let expireSeconds = options && options.expireSeconds ? options.expireSeconds : 10;  

            for ( let p in blockingInfo) 
                if (blockingInfo[p]) {
                    switch(p) {
                        case 'blockingKey': // blockingKey is the redis list key and not part of the list itself
                            break;
                            
                        case 'start':
                            setParams.push(p);
                            setParams.push( blockingInfo.start.toISOString() );
                            break;

                        default:
                            setParams.push(p);
                            setParams.push(blockingInfo[p]);
                            break;   
                    }    
                }                
            
            cacheClient.hmset( 'entityLock:' + blockingInfo.blockingKey, ...setParams, err => {
                if (!err)
                    cacheClient.expire( 'entityLock:' + blockingInfo.blockingKey, expireSeconds, err => {
                        if (!err)
                            resolve();
                        else
                            reject(err);
                    });
                else
                    reject(err);
            });
        });
    else
        return Promise.resolve();
}


function getBlockingInfo(cacheClient : RedisClient, blockingKey : string) : Promise<BlockingInfo>
{
    return new Promise<BlockingInfo>((resolve,reject)=>{
        cacheClient.hgetall('entityLock:' + blockingKey, ( error, result ) => {
            if (!error) {
                let formattedResult : any;

                if (result != null) {
                    formattedResult = { blockingKey };

                    for (let p in result) {
                        if ( result[p] != null) {
                            switch (p) 
                            {
                                case 'start':
                                    formattedResult[p] = new Date(result[p]);
                                    break;

                                default:
                                    formattedResult[p] = result[p];
                                    break;
                            }       
                        }
                    }
                }

                resolve ( formattedResult );
            }
            else
                reject(error);
        }); 
    });
}

function removeBlocking(cacheClient : RedisClient, blockingKey : string) : Promise<void>
{
    return new Promise<void>( (resolve, reject) => {
        cacheClient.del('entityLock:'+ blockingKey, error => {
            if(!error)
                resolve();
            else
                reject(error);
        });
    });
}


interface BlockingInfo {
    blockingKey: string;
    serviceOrigin: string;
    entityOrigin?: string;
    entityInstanceOrigin?: string
    action?: string;
    customOperationReference?: string;
    start: Date
}

export {  
    BlockingInfo,
    lockEntityMultikey,
    unlockEntityMultikey 
}

