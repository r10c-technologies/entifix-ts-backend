"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const CrossEnums_1 = require("../schemas/CrossEnums");
// import { TransactionState } from '../schemas/CrossStates';
function findEntityMultiKey(session, info, undefinedOperator) {
    return __awaiter(this, void 0, void 0, function* () {
        let searchOperator = indentifySearchOperator(undefinedOperator);
        if (searchOperator) {
            switch (searchOperator.searchOperator) {
                case CrossEnums_1.SearchOperator.byKey:
                    let key = searchOperator.value;
                    return session.findByKey(info, key);
                    break;
                default:
                    return findEntity(session, info, undefinedOperator);
            }
        }
        else
            return null;
    });
}
exports.findEntityMultiKey = findEntityMultiKey;
function findEntity(session, info, undefinedOperator) {
    return __awaiter(this, void 0, void 0, function* () {
        let searchOperator = indentifySearchOperator(undefinedOperator);
        if (searchOperator) {
            switch (searchOperator.searchOperator) {
                case CrossEnums_1.SearchOperator.byId:
                    let id = searchOperator.value;
                    return session.findEntity(info, id);
                    break;
                default:
                    return null;
            }
        }
        else
            return null;
    });
}
exports.findEntity = findEntity;
function indentifySearchOperator(undefinedOperator) {
    if (undefinedOperator) {
        if (undefinedOperator.$byKey) {
            let value = undefinedOperator.$byKey;
            return { searchOperator: CrossEnums_1.SearchOperator.byKey, value };
        }
        else if (undefinedOperator.$byId) {
            let value = undefinedOperator.$byId;
            return { searchOperator: CrossEnums_1.SearchOperator.byId, value };
        }
    }
    return null;
}
//# sourceMappingURL=CrossOperations.js.map