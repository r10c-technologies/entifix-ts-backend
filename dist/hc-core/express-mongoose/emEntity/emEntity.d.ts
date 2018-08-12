import { Entity, EntityMovementFlow } from '../../hcEntity/hcEntity';
import mongoose = require('mongoose');
import { EMSession } from '../emSession/emSession';
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
