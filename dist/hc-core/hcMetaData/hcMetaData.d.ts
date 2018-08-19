import 'reflect-metadata';
declare function DefinedEntity(): any;
declare function DefinedEntity(params: {
    packageName?: string;
    abstract?: boolean;
}): any;
declare function DefinedAccessor(params?: {
    exposed?: boolean;
    schema?: any;
    persistenceType?: PersistenceType;
    persistentAlias?: string;
    readOnly?: boolean;
}): (target: any, key: string, descriptor: PropertyDescriptor) => void;
declare function DefinedMethod(): (target: any, key: string, descriptor: PropertyDescriptor) => void;
declare function Defined(...args: any[]): any;
declare class EntityInfo {
    private _packageName;
    private _name;
    private _definedMembers;
    private _base;
    private _isAbstract;
    constructor(name: string);
    addAccessorInfo(accessorInfo: AccessorInfo): void;
    addPropertyInfo(propertyInfo: PropertyInfo): void;
    addMethodInfo(methodInfo: MethodInfo): void;
    getAllMembers(): Array<MemberInfo>;
    getExposedAccessors(): Array<AccessorInfo>;
    getAccessorSchemas(): Array<{
        accessorName: string;
        accessorSchema: any;
    }>;
    getCompleteSchema(): any;
    implementBaseInfo(baseInfo: EntityInfo): void;
    implementBaseInfo(baseInfo: EntityInfo, isAbstract: boolean): void;
    static implementAbstractInfo(info: EntityInfo): void;
    name: string;
    packageName: string;
    readonly base: EntityInfo;
    readonly isAbstract: boolean;
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
    private _exposed;
    private _schema;
    private _persistenceType;
    private _persistentAlias;
    private _readOnly;
    constructor();
    exposed: boolean;
    schema: any;
    persistenceType: PersistenceType;
    persistentAlias: string;
    readOnly: boolean;
}
declare class MethodInfo extends MemberInfo {
    constructor();
}
interface IMetaDataInfo {
    entityInfo: EntityInfo;
}
declare enum PersistenceType {
    Defined = 1,
    Auto = 2
}
export { EntityInfo, Defined, DefinedAccessor, DefinedEntity, DefinedMethod, IMetaDataInfo, PersistenceType, AccessorInfo, MemberInfo, MethodInfo, PropertyInfo };
