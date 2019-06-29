import 'reflect-metadata';
import { Entity } from '../hcEntity/hcEntity';
import { HcSession } from '../hcSession/hcSession';
declare function DefinedEntity(): any;
declare function DefinedEntity(params: {
    packageName?: string;
    abstract?: boolean;
    fixedSystemOwner?: string;
    allowRequestedType?: boolean | RequestedType | Array<RequestedType>;
}): any;
declare function DefinedAccessor(params?: {
    exposition?: ExpositionType;
    schema?: any;
    persistenceType?: PersistenceType;
    alias?: string;
    serializeAlias?: string;
    persistentAlias?: string;
    activator?: MemberActivator;
    display?: string;
}): (target: any, key: string, descriptor: PropertyDescriptor) => void;
interface DefinedMetaParam {
    name: string;
    index: number;
    required?: boolean;
    special?: boolean;
}
declare function DefinedParam(paramName: string): any;
declare function DefinedParam(paramName: string, options: {
    required?: boolean;
}): any;
declare function SessionParam(): (target: Object, propertyKey: string | symbol, parameterIndex: number) => void;
declare function DefinedMethod(): any;
declare function DefinedMethod(params: {
    eventName?: string;
    returnActionData?: boolean;
}): any;
declare class EntityInfo {
    private _packageName;
    private _name;
    private _display;
    private _definedMembers;
    private _base;
    private _isAbstract;
    private _fixedSystemOwner;
    private _allowRequestedType;
    constructor(name: string);
    constructor(name: string, options: {
        fixedSystemOwner: string;
        allowRequestedType: boolean | RequestedType | Array<RequestedType>;
    }, display: string);
    constructor(name: string, options: {
        fixedSystemOwner: string;
        allowRequestedType: boolean | RequestedType | Array<RequestedType>;
    }, display?: string);
    addAccessorInfo(accessorInfo: AccessorInfo): void;
    addPropertyInfo(propertyInfo: PropertyInfo): void;
    addMethodInfo(methodInfo: MethodInfo): void;
    getAllMembers(): Array<MemberInfo>;
    getAccessors(): Array<AccessorInfo>;
    getDefinedMethods(): Array<MethodInfo>;
    getAccessorSchemas(): Array<{
        accessorName: string;
        accessorSchema: any;
        alias?: string;
    }>;
    getCompleteSchema(): any;
    implementBaseInfo(baseInfo: EntityInfo): void;
    implementBaseInfo(baseInfo: EntityInfo, isAbstract: boolean): void;
    static implementAbstractInfo(info: EntityInfo): void;
    name: string;
    display: string;
    packageName: string;
    readonly base: EntityInfo;
    readonly isAbstract: boolean;
    readonly fixedSystemOwner: string;
    readonly allowRequestedType: boolean | RequestedType | RequestedType[];
}
declare abstract class MemberActivator {
    private _bindingType;
    private _resourcePath;
    private _extendRoute;
    constructor(bindingType: MemberBindingType, extendedRoute: boolean, resourcePath: string);
    abstract activateMember(entity: Entity, session: HcSession, accessorInfo: AccessorInfo, options?: {
        oldValue?: any;
    }): Promise<{
        oldValue?: any;
        newValue: any;
    }>;
    readonly bindingType: MemberBindingType;
    readonly resourcePath: string;
    readonly extendRoute: boolean;
    abstract readonly referenceType: string;
    abstract readonly defaultSchema: any;
}
declare abstract class MemberInfo {
    private _name;
    private _className;
    private _packageName;
    private _type;
    constructor();
    name: string;
    className: string;
    packageName: string;
    type: string;
}
declare class PropertyInfo extends MemberInfo {
    constructor();
}
declare class AccessorInfo extends MemberInfo {
    private _display;
    private _exposition;
    private _schema;
    private _persistenceType;
    private _serializeAlias;
    private _activator;
    private _persistentAlias;
    constructor();
    setAlias(alias: string): void;
    display: string;
    exposition: ExpositionType;
    schema: any;
    persistenceType: PersistenceType;
    serializeAlias: string;
    persistentAlias: string;
    activator: MemberActivator;
}
declare class MethodInfo extends MemberInfo {
    private _parameters;
    private _eventName;
    private _returnActionData;
    constructor();
    parameters: DefinedMetaParam[];
    eventName: string;
    returnActionData: boolean;
}
interface IMetaDataInfo {
    entityInfo: EntityInfo;
}
declare enum PersistenceType {
    Defined = 1,
    Auto = 2
}
declare enum ExpositionType {
    System = "system",
    Normal = "normal",
    ReadOnly = "readOnly"
}
declare enum MemberBindingType {
    Reference = 1,
    Snapshot = 2,
    Chunks = 3
}
declare enum RequestedType {
    XLS = "xls",
    PDF = "pdf"
}
export { MemberBindingType, ExpositionType, EntityInfo, DefinedAccessor, DefinedEntity, DefinedMethod, DefinedParam, SessionParam, IMetaDataInfo, PersistenceType, AccessorInfo, MemberInfo, MethodInfo, PropertyInfo, MemberActivator };
