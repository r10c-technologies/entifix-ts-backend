import 'reflect-metadata';
import { error } from 'util';
import { Entity } from '../hcEntity/hcEntity';
import { HcSession } from '../hcSession/hcSession';
import { method } from 'bluebird';

function DefinedEntity( );
function DefinedEntity( params : { packageName? : string, abstract? : boolean } );
function DefinedEntity( params? : { packageName : string, abstract? : boolean } )
{    
    return function(target : Function)
    {
        //var entityInfo = checkMetadata(target);
        //target.prototype.entityInfo.name = params.name;

        let tempPackageName = params != null && params.packageName != null ? params.packageName : 'app';
        let tempIsAbstract = params != null && params.abstract != null ? params.abstract : false; 

        //let info = defineMetaData( target, CreationType.class );
        
        if (!target.prototype.entityInfo)
            target.prototype.entityInfo = new EntityInfo(target.name);
        
        let info = target.prototype.entityInfo;

        if (info.name != target.name)
        {
            let newInfo = new EntityInfo(target.name);
            newInfo.implementBaseInfo(info, tempIsAbstract );
            newInfo.packageName = tempPackageName;
            
            target.prototype.entityInfo = newInfo;
        }
        
    }
}

function DefinedAccessor( params? : {   exposition? : ExpositionType, 
                                        schema? : any, 
                                        persistenceType? : PersistenceType, 
                                        alias? : string,
                                        serializeAlias? : string,
                                        persistentAlias? : string,
                                        activator? : MemberActivator } ) 
{

    params = params || { };
    return function (target: any, key: string, descriptor : PropertyDescriptor)
    {        
        var entityInfo = defineMetaData(target, CreationType.member);
        var reflectInfo = Reflect.getMetadata('design:type', target, key);
        
        var info = new AccessorInfo();
        info.name = key;
        info.schema = params.schema;
        info.className = target.constructor.name;
        info.type = reflectInfo.name;
        info.persistenceType = params.persistenceType || PersistenceType.Defined;
        info.activator = params.activator;
        
        if (params.alias)
            info.setAlias(params.alias);
        if (params.serializeAlias)
            info.serializeAlias = params.serializeAlias;
        if (params.persistentAlias)
            info.persistentAlias = params.persistentAlias;
        if (params.exposition)
            info.exposition = params.exposition;

        if (params.persistenceType && params.persistenceType == PersistenceType.Auto && params.schema)
            console.warn(`The Persistence type for ${key} is defined as Auto, so the defined Schema will be ignored`);

        if (reflectInfo.name == 'Object' && params.persistenceType != PersistenceType.Auto)
            console.warn(`It seems the accessor ${key} does not have an explicit type. Please make sure that the type name it is not necessary in the exposed metadata`);

        entityInfo.addAccessorInfo(info);
    }
}

function DefinedProperty ()
{
    return function (target: Object, key: string)
    {
        //To be programmed

    }
}


const definedParamKey = Symbol("definedParam");
interface DefinedParam {
    name: string;
    index: number;
    required: boolean;
}

function DefinedParam( paramName : string, required? : boolean )
{
    if (!paramName)
        throw "Name param is required";
    
    return function(target: Object, propertyKey: string | symbol, parameterIndex: number) 
    {
        required = required != null ? required : false; 
        let definedParameters: Array<DefinedParam> = Reflect.getOwnMetadata(definedParamKey, target, propertyKey) || new Array<DefinedParam>();
        definedParameters.push({ name: paramName, index: parameterIndex, required });

        Reflect.defineMetadata(definedParamKey, definedParameters, target, propertyKey);
    }
}

function DefinedMethod( params? : { } )
{
    return function(target: any, propertyName: string, descriptor: TypedPropertyDescriptor<Function>)
    {
        let entityInfo = defineMetaData(target, CreationType.member);
        
        let methodInfo = new MethodInfo();
        methodInfo.name = propertyName;
        methodInfo.className = target.constructor.name;
        methodInfo.parameters = Reflect.getOwnMetadata( definedParamKey, target, propertyName );
        entityInfo.addMethodInfo(methodInfo);

        let originalMethod = descriptor.value;

        descriptor.value = function()
        {
            let params = new Array<any>();
            let argumetsArray = new Array<{key,value}>();

            for (let a in arguments)
            {
                let key = arguments[a].key;
                let value = arguments[a].value;
                argumetsArray.push( { key, value } );
            }
                
            let limit = Math.max( ...methodInfo.parameters.map( dp => dp.index ) );

            for ( let i = 0; i <= limit; i++ )
            {
                let defParam = methodInfo.parameters.find( dp => dp.index == i );
                if (defParam)
                {
                    let arg = argumetsArray.find( a => a.key == defParam.name );
                    params.push(arg ? arg.value : null);
                }
                else
                    params.push(null);
            }

            return originalMethod.apply(this, params);
        }
    }
}

// function DefinedMethod ( params? : { } )
// {
//     params = params || { };
//     return function (target: any, key: string, descriptor : PropertyDescriptor)
//     {
//         let entityInfo = defineMetaData(target, CreationType.member);
//         let reflectInfo = Reflect.getMetadata('design:type', target, key);

//         let methodInfo = new MethodInfo();
//         methodInfo.name = key;
//         methodInfo.className = target.constructor.name;
        
//         entityInfo.addMethodInfo(methodInfo);
//     }
// }


function defineMetaData( objectWithMetadata : any, creationType : CreationType ): EntityInfo
{
    let info : EntityInfo;

    switch (creationType)
    {
        case CreationType.member:
        {
            if ( !(<IMetaDataInfo>objectWithMetadata).entityInfo)
                (<IMetaDataInfo>objectWithMetadata).entityInfo = new EntityInfo(objectWithMetadata.constructor.name);;
            
            info = (<IMetaDataInfo>objectWithMetadata).entityInfo;
        }

        case CreationType.class:
        {
            // It is not possible access the prototype here

        }
    }

    if (!info)
        throw new error('It was not possible to construct the metadata for the Object');

    return info;
}

enum CreationType {
    member = 1,
    class = 2
}


function isMetaDataInfo(object: any): object is IMetaDataInfo 
{
    return 'entityInfo' in object;
} 

class EntityInfo
{
    //#region Properties
    private _packageName: string;
    private _name : string;
    private _definedMembers : Array<MemberInfo>;
    private _base : EntityInfo;
    private _isAbstract : boolean;
    
    //#endregion

    //#region Methods
    constructor( name : string )
    {   
        this._name = name;
        this._definedMembers = new Array<MemberInfo>();    
        this._isAbstract = true;
    }

    addAccessorInfo( accessorInfo : AccessorInfo ) : void
    {
        this._definedMembers.push(accessorInfo);
    }

    addPropertyInfo( propertyInfo : PropertyInfo ) : void
    {
        this._definedMembers.push( propertyInfo );
    }

    addMethodInfo( methodInfo : MethodInfo ) : void
    {
        this._definedMembers.push( methodInfo );
    } 

    getAllMembers( ) : Array<MemberInfo>
    {
        let allMembers = new Array<MemberInfo>();

        let tempInfo : EntityInfo = this;

        while (tempInfo)
        {
            allMembers = allMembers.concat(tempInfo._definedMembers);
            tempInfo = tempInfo.base;
        }

        return allMembers;
    }

    getAccessors( ) : Array<AccessorInfo>
    {
        return this.getAllMembers().filter( e => e instanceof AccessorInfo ).map( e => e as AccessorInfo);
    }

    getDefinedMethods( ) : Array<MethodInfo>
    {
        return this.getAllMembers().filter( e => e instanceof MethodInfo ).map( e => e as MethodInfo );
    }


    getAccessorSchemas() : Array<{ accessorName : string, accessorSchema : any, alias?: string}>
    {        
        return this.getAllMembers().filter( e => e instanceof AccessorInfo && (<AccessorInfo>e).schema != null && (<AccessorInfo>e).persistenceType == PersistenceType.Defined).map( 
            e => { return { accessorName: e.name, accessorSchema: (<AccessorInfo>e).schema, alias: (<AccessorInfo>e).persistentAlias } } 
        );
    }

    getCompleteSchema() : any
    {
        var schema = {};

        this.getAccessorSchemas().forEach( schemaProperty => {
            let persistentName = schemaProperty.alias ? schemaProperty.alias : schemaProperty.accessorName;
            schema[persistentName] = schemaProperty.accessorSchema;
        });

        return schema;
    }

    implementBaseInfo(baseInfo : EntityInfo) : void;
    implementBaseInfo(baseInfo : EntityInfo, isAbstract: boolean) : void;
    implementBaseInfo(baseInfo : EntityInfo, isAbstract?: boolean) : void
    {
        if ( isAbstract != null)
            this._isAbstract = isAbstract;

        if ( baseInfo._definedMembers != null && baseInfo._definedMembers.length > 0)
        {
            let i = 0;
            while ( baseInfo._definedMembers.length > i )
            {
                let member = baseInfo._definedMembers[i];
                if (member.className == this._name)
                {
                    baseInfo._definedMembers.splice(i, 1);
                    this._definedMembers.push(member);
                }
                else
                    i++;
            }
        }

        this._base = baseInfo;
    }

    static implementAbstractInfo( info : EntityInfo )
    {
        info._isAbstract = false;
    }

    //#endregion

    //#region Accessors

    get name () 
    { return this._name; }
    set name (value)
    { this._name = value; } 
    get packageName ()
    { return this._packageName; }
    set packageName (value)
    { this._packageName = value; }

    get base ()
    { return this._base; }
    
    get isAbstract ()
    { return this._isAbstract; }

    //#endregion
}

abstract class MemberActivator
{
    //#region Properties

    private _entityInfo : EntityInfo;
    
    //#endregion

    //#region Methods
        
    constructor(info : EntityInfo)
    {
        this._entityInfo = info;
    }

    abstract activateMember( entity : Entity, session : HcSession, accessorInfo : AccessorInfo, options?: { oldValue? : any } ) : Promise<{ oldValue? : any, newValue : any }>
        
    //#endregion

    //#region Accessors

    get entityInfo()
    { return this._entityInfo; }

    abstract get resourcePath() : string;
    abstract get extendRoute () : boolean;
    abstract get bindingType () : MemberBindingType;
    abstract get referenceType () : string;
    
    //#endregion

}

abstract class MemberInfo
{
    //#region Properties

    private _name : string;
    private _className : string;
    private _packageName : string;
    private _type : string;

    //#endregion

    //#region Methods
    
    constructor ()
    {

    }

    //#endregion

    //#region Accessors

    get name () 
    { return this._name; }
    set name (value)
    { this._name = value; }

    get className ()
    { return this._className; }
    set className (value)
    { this._className = value; }

    get packageName ()
    { return this._packageName; }
    set packageName (value)
    { this._packageName = value; }

    get type()
    { return this._type; }
    set type(value)
    { this._type = value; }

    //#endregion
}

class PropertyInfo extends MemberInfo
{
    //#region Properties

    //#endregion

    //#region Methods
    
    constructor ()
    {
        super();
    }

    //#endregion

    //#region Accessors

    //#endregion
}

class AccessorInfo extends MemberInfo
{
    //#region Properties

    private _exposition : ExpositionType;
    private _schema : any;
    private _persistenceType : PersistenceType;
    private _serializeAlias : string;
    private _activator : MemberActivator;
    private _persistentAlias : string;

    //#endregion

    //#region Methods
    
    constructor ()
    {
        super();

        this._persistenceType = PersistenceType.Defined;
    }

    setAlias(alias : string) : void
    {
        this._persistentAlias = alias;
        this._serializeAlias = alias;
    }

    //#endregion

    //#region Accessors

    get exposition () 
    { return this._exposition; }
    set exposition (value)
    { this._exposition = value; }

    get schema ()
    { return this._schema; }
    set schema (value)
    { this._schema = value; }

    get persistenceType ()
    { return this._persistenceType; }
    set persistenceType (value)
    { this._persistenceType = value; }

    get serializeAlias ( )
    { return this._serializeAlias; }
    set serializeAlias( value )
    { this._serializeAlias = value; }

    get persistentAlias ( )
    { return this._persistentAlias; }
    set persistentAlias( value )
    { this._persistentAlias = value; }

    get activator( )
    { return this._activator; }
    set activator( value )
    { this._activator = value; }
    
    //#endregion
}

class MethodInfo extends MemberInfo
{
    //#region Properties

    private _parameters : Array<DefinedParam>;

    //#endregion

    //#region Methods
    
    constructor ()
    {
        super();

        this._parameters = new Array<DefinedParam>();
    }

    //#endregion

    //#region Accessors

    get parameters ()
    { return this._parameters; }
    set parameters ( value )
    { this._parameters = value; }

    //#endregion
}

interface IMetaDataInfo 
{
    entityInfo : EntityInfo
}

enum PersistenceType
{
    Defined  = 1,
    Auto = 2
}

enum ExpositionType
{
    Normal = 'normal',
    ReadOnly = 'readOnly'
}


enum MemberBindingType
{
    Reference = 1,
    Snapshot = 2
}

export {
    MemberBindingType,
    ExpositionType, 
    EntityInfo, 
    DefinedAccessor, 
    DefinedEntity, 
    DefinedMethod,
    DefinedParam,
    IMetaDataInfo, 
    PersistenceType,
    AccessorInfo,
    MemberInfo,
    MethodInfo, 
    PropertyInfo,
    MemberActivator
}