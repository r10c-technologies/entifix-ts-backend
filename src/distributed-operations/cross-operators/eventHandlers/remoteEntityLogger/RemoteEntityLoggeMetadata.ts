import 'reflect-metadata';

const RemoteAccessorMetaKey = Symbol('RemoteAccessorMetaKey');

interface RemoteAccessorData {
    name : string, type: string
}

function RemoteAccessor()
{
    return function (target: any, key: string, descriptor : PropertyDescriptor)
    {
        let metadaValues = Reflect.getMetadata(RemoteAccessorMetaKey, target) as Array<RemoteAccessorData>;
        let designType = Reflect.getMetadata('design:type', target, key);

        if (!metadaValues)
            metadaValues = new Array<RemoteAccessorData>();

        metadaValues.push( { name: key, type: designType.name });

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







