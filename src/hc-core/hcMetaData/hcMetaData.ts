import 'reflect-metadata';
import { error } from 'util';
import { Entity } from '../hcEntity/hcEntity';

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

// function DefinedAccessor();
// function DefinedAccessor( params : { exposed? : boolean, schema? : any });
function DefinedAccessor( params? : { exposed? : boolean, schema? : any, persistenceType? : PersistenceType, persistentAlias? : string, readOnly? : boolean })
{
    params = params || { };
    return function (target: any, key: string, descriptor : PropertyDescriptor)
    {        
        var entityInfo = defineMetaData(target, CreationType.member);
        var reflectInfo = Reflect.getMetadata('design:type', target, key);
        
        var info = new AccessorInfo();
        info.exposed = params.exposed || false;
        info.name = key;
        info.schema = params.schema;
        info.className = target.constructor.name;
        info.type = reflectInfo.name;
        info.persistenceType = params.persistenceType || PersistenceType.Defined;
        info.persistentAlias = params.persistentAlias;
        info.readOnly = params.readOnly != null ?  params.readOnly : false;

        if (params.persistenceType && params.persistenceType == PersistenceType.Auto && params.schema)
            console.warn(`The Persistence type for ${key} is defined as Auto, so the defined Schema will be ignored`);

        if (reflectInfo.name == 'Object')
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

function DefinedMethod ()
{
    return function (target: any, key: string, descriptor : PropertyDescriptor)
    {
        //To be programmed

    }
}

function DefinedParameter ()
{
    return function (target: Object, key: string, order : number)
    {
        //To be programmed

    }
}

function Defined(...args : any[])
{
    switch(args.length)
    {
        case 1:
            return DefinedEntity.apply(this, args);
        case 2:
            return DefinedProperty.apply(this, args);
        case 3:
            if ( typeof args[2] == "number" )
                return DefinedParameter.apply(this, args);
            else
                return DefinedAccessor.apply(this, args);
    }
}

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

    getExposedAccessors() : Array<AccessorInfo>
    {
        return this.getAllMembers().filter( e => e instanceof AccessorInfo && (<AccessorInfo>e).exposed).map( e => <AccessorInfo>e );
    }

    getAccessorSchemas() : Array<{ accessorName : string, accessorSchema : any }>
    {        
        return this.getAllMembers().filter( e => e instanceof AccessorInfo && (<AccessorInfo>e).schema != null && (<AccessorInfo>e).persistenceType == PersistenceType.Defined).map( 
            e => { return { accessorName: e.name, accessorSchema: (<AccessorInfo>e).schema } } 
        );
    }

    getCompleteSchema() : any
    {
        var schema = {};

        this.getAccessorSchemas().forEach( schemaProperty => {
            schema[schemaProperty.accessorName] = schemaProperty.accessorSchema;
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

    private _exposed : boolean;
    private _schema : any;
    private _persistenceType : PersistenceType;
    private _persistentAlias : string;
    private _readOnly : boolean;

    //#endregion

    //#region Methods
    
    constructor ()
    {
        super();

        this._persistenceType = PersistenceType.Defined;
        this._exposed = false;
        this._readOnly = false;
    }

    //#endregion

    //#region Accessors

    get exposed () 
    { return this._exposed; }
    set exposed (value)
    { this._exposed = value; }

    get schema ()
    { return this._schema; }
    set schema (value)
    { this._schema = value; }

    get persistenceType ()
    { return this._persistenceType; }
    set persistenceType (value)
    { this._persistenceType = value; }

    get persistentAlias ( )
    { return this._persistentAlias; }
    set persistentAlias( value )
    { this._persistentAlias = value; }

    get readOnly( )
    { return this._readOnly; }
    set readOnly( value )
    { this._readOnly = value; }
    
    //#endregion
}

class MethodInfo extends MemberInfo
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

interface IMetaDataInfo 
{
    entityInfo : EntityInfo
}

enum PersistenceType
{
    Defined  = 1,
    Auto = 2
}

export { 
    EntityInfo, 
    Defined, 
    DefinedAccessor, 
    DefinedEntity, 
    DefinedMethod, 
    IMetaDataInfo, 
    PersistenceType,
    AccessorInfo,
    MemberInfo,
    MethodInfo, 
    PropertyInfo 
}