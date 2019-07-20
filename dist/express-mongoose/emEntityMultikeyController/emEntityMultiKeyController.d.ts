import express = require('express');
import { EMEntityController } from '../emEntityController/emEntityController';
import { EMEntityMultiKey } from '../emEntityMultiKey/emEntityMultiKey';
import { EntityDocument } from '../emEntity/emEntity';
declare class EMEntityMutltiKeyController<TDocument extends EntityDocument, TEntityMK extends EMEntityMultiKey> extends EMEntityController<TDocument, TEntityMK> {
    protected createRoutes(): void;
    retrieveByKey(request: express.Request, response: express.Response, next: express.NextFunction): void;
}
export { EMEntityMutltiKeyController };
