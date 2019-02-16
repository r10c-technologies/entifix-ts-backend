import mongoose = require('mongoose');
import { Entity, EntityMovementFlow } from '../../hc-core/hcEntity/hcEntity';
import { EMSession } from '../emSession/emSession';
import { EntityInfo } from '../../hc-core/hcMetaData/hcMetaData';
interface IBaseEntity {
    created: Date;
    modified?: Date;
    deleted?: Date;
    deferredDeletion?: Boolean;
    createdBy: string;
    modifiedBy?: string;
    deletedBy?: string;
}
interface EntityDocument extends mongoose.Document, IBaseEntity {
}
declare class EMEntity extends Entity {
    protected _document: EntityDocument;
    private _session;
    private _instancedChanges;
    constructor(session: EMSession);
    constructor(session: EMSession, document: EntityDocument);
    serializeExposedAccessors(): any;
    static deserializeAccessors(info: EntityInfo, simpleObject: any): {
        persistent?: any;
        nonPersistent?: any;
        readOnly?: any;
        nonValid?: any;
    };
    save(): Promise<EntityMovementFlow>;
    delete(): Promise<EntityMovementFlow>;
    protected onSaving(): Promise<EntityMovementFlow>;
    protected onDeleting(): Promise<EntityMovementFlow>;
    protected onSaved(): void | Promise<void>;
    protected onDeleted(): void | Promise<void>;
    static getSchema(): any;
    getDocument(): EntityDocument;
    equals(otherEntity: Entity): boolean;
    private syncActibableAccessors;
    readonly session: EMSession;
    created: Date;
    modified: Date;
    deleted: Date;
    readonly _id: any;
    readonly __v: number;
    deferredDeletion: Boolean;
    instancedChanges: {
        property: string;
        oldValue: any;
        newValue: any;
    }[];
    readonly isNew: boolean;
    readonly key: {
        service: string;
        entityName: string;
        id: any;
    };
    readonly createdBy: string;
    readonly modifiedBy: string;
    readonly deletedBy: string;
}
export { EMEntity, EntityDocument, IBaseEntity };
