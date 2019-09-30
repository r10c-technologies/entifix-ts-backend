import 'reflect-metadata';

const RemoteAccessorMetaKey = Symbol('RemoteAccessorMetaKey');

interface RemoteAccessorData {
    name : string, type: string, target?: string, extract?: string | {from: string, to: string} | Array<{from: string, to: string}> 
}

function RemoteAccessor( );
function RemoteAccessor( options?: { target?: string, extract?: string } );
function RemoteAccessor( options?: { target?: string, extract?: {from: string, to: string} });
function RemoteAccessor( options?: { target?: string, extract?: Array<{from: string, to: string}> });
function RemoteAccessor( options?: { target?: string, extract?: string | {from: string, to: string} | Array<{from: string, to: string}> })
{
    return function (target: any, key: string, descriptor : PropertyDescriptor)
    {
        options = options || {};
        let metadaValues = Reflect.getMetadata(RemoteAccessorMetaKey, target) as Array<RemoteAccessorData>;
        let designType = Reflect.getMetadata('design:type', target, key);

        if (!metadaValues)
            metadaValues = new Array<RemoteAccessorData>();

        metadaValues.push( { name: key, type: designType.name, target:options.target, extract: options.extract });
        Reflect.defineMetadata(RemoteAccessorMetaKey, metadaValues, target);
    }
}

function getRemoteAccessors(target : any) {
    return Reflect.getMetadata(RemoteAccessorMetaKey, target) as Array<RemoteAccessorData>;
}

export { 
    RemoteAccessor, 
    getRemoteAccessors
}







