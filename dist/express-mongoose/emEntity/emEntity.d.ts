import mongoose = require('mongoose');
import { Entity, EntityMovementFlow } from '../../hc-core/hcEntity/hcEntity';
import { EMSession } from '../emSession/emSession';
import { EntityInfo } from '../../hc-core/hcMetaData/hcMetaData';
interface EntityDocument extends mongoose.Document {
    created: Date;
    modified: Date;
    deleted: Date;
    deferredDeletion: Boolean;
}
declare class EMEntity extends Entity {
    protected _document: EntityDocument;
    private _session;
    constructor(session: EMSession);
    constructor(session: EMSession, document: EntityDocument);
    serializeExposedAccessors(): any;
    static deserializePersistentAccessors(info: EntityInfo, simpleObject: any): any;
    save(): Promise<EntityMovementFlow>;
    delete(): Promise<EntityMovementFlow>;
    protected onSaving(): Promise<EntityMovementFlow>;
    protected onDeleting(): Promise<EntityMovementFlow>;
    protected onSaved(): void;
    protected onDeleted(): void;
    static getSchema(): any;
    getDocument(): EntityDocument;
    readonly session: EMSession;
    created: Date;
    modified: Date;
    deleted: Date;
    readonly _id: any;
    readonly __v: number;
    deferredDeletion: Boolean;
}
interface IBaseEntity {
    created: Date;
    modified: Date;
}
export { EMEntity, IBaseEntity, EntityDocument };
