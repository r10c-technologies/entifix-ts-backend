import { Entity } from '../../hcEntity/hcEntity';
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
    save(): Promise<void>;
    delete(): Promise<void>;
    onSaving(): void;
    onDeleting(): void;
    onSaved(): void;
    onDeleted(): void;
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
