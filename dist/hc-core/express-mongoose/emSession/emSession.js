"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const hcSession_1 = require("../../hcSession/hcSession");
const hcMetaData_1 = require("../../hcMetaData/hcMetaData");
class EMSession extends hcSession_1.HcSession {
    //#endregion
    //#region Methods
    constructor() {
        super();
    }
    connect(url, success, error) {
        this._mongooseConnection = mongoose.createConnection("mongodb://" + url);
    }
    getModel(entityName) {
        return (this.entitiesInfo.find(e => e.name == entityName).model);
    }
    //registerEntity<TDocument extends mongoose.Document, TEntity extends EMEntity>(entityName: string, structureSchema : Object, type: { new( session: EMSession, document : EntityDocument ) : TEntity} ) : void
    registerEntity(type, entityInfo) {
        //var info : EntityInfo = (<any>type).entityInfo; 
        var structureSchema = entityInfo.getCompleteSchema();
        var entityName = entityInfo.name;
        if (this.entitiesInfo.filter(e => e.name == entityName).length == 0) {
            var schema;
            var model;
            //schema = <mongoose.Schema>( this._mongooseInstance.Schema(structureSchema) );
            schema = new mongoose.Schema(structureSchema);
            model = this._mongooseConnection.model(entityName, schema);
            this.addEntityInfo({
                name: entityName,
                info: entityInfo,
                schema: schema,
                model: model,
                activateType: (d) => {
                    return new type(this, d);
                }
            });
        }
        else
            console.warn('Attempt to duplicate entity already registered: ' + entityName);
    }
    createDocument(entityName, document) {
        return new Promise((resolve, reject) => {
            let model = this.getModel(entityName);
            this.manageDocumentCreation(document);
            model.create(document).then(value => resolve(value), error => reject(this.createError(error, 'Session: Error in create document')));
        });
    }
    updateDocument(entityName, document) {
        return new Promise((resolve, reject) => {
            let model = this.getModel(entityName);
            this.manageDocumentUpdate(document);
            model.findByIdAndUpdate(document._id, document, (error, result) => {
                if (!error) {
                    this.findDocument(entityName, document._id).then(res => resolve(res), err => reject(err));
                }
                else
                    reject(this.createError(error, 'Session: Error in update document'));
            });
        });
    }
    listDocuments(entityName, options) {
        return new Promise((resolve, reject) => {
            //PREPARE QUERY =====>>>>>           
            let skip = options != null && options.skip != null ? options.skip : 0;
            let take = options != null && options.take != null ? options.take : null;
            //Construct Mongo parameters
            let mongoFilters = this.resolveToMongoFilters(entityName, options != null && options.filters != null ? options.filters : null);
            if (mongoFilters.error)
                reject(this.createError(null, mongoFilters.message));
            let mongoSorting = this.resolveToMongoSorting(entityName, options != null && options.sorting != null ? options.sorting : null);
            if (mongoSorting != null && mongoSorting.error)
                reject(this.createError(null, mongoSorting.message));
            //Create Query
            let query = this.getModel(entityName).find(mongoFilters.filters);
            //Order Query
            if (mongoSorting != null && mongoSorting.sorting != null)
                query = query.sort(mongoSorting.sorting);
            //Limit Query
            if (skip > 0)
                query = query.skip(skip);
            if (take != null)
                query = query.limit(take);
            //EXECUTE QUERY =====>>>>>
            query.exec((error, result) => {
                if (!error)
                    resolve(result);
                else
                    reject(this.createError(error, 'Session: Error in retrive docments'));
            });
        });
    }
    findDocument(entityName, id) {
        return new Promise((resolve, reject) => {
            this.getModel(entityName).where("deferredDeletion").ne(true).where("_id", id).then(res => resolve(res != null && res.length > 0 ? res[0] : null), err => reject(this.createError(err, 'Session: Error in retrive single document')));
        });
    }
    deleteDocument(entityName, document) {
        return new Promise((resolve, reject) => {
            let model = this.getModel(entityName);
            this.manageDocumentDeletion(document);
            model.findByIdAndUpdate(document._id, document, (error, result) => {
                if (!error)
                    resolve();
                else
                    reject(this.createError(error, 'Session: Error in delete document'));
            });
        });
    }
    activateEntityInstance(name, document) {
        return this.entitiesInfo.find(a => a.name == name).activateType(document);
    }
    getMetadataToExpose(entityName) {
        let info = (this.entitiesInfo.find(e => e.name == entityName).info);
        return info.getExposedAccessors().map(accessor => {
            return {
                name: accessor.name,
                type: accessor.type,
                persistent: (accessor.schema != null || accessor.persistenceType == hcMetaData_1.PersistenceType.Auto)
            };
        });
    }
    enableDevMode() {
        this._devMode = true;
    }
    disableDevMode() {
        this._devMode = false;
    }
    createError(error, message) {
        if (this._devMode) {
            console.warn('DevMode: Error in EMSession: ' + message);
            return new EMSessionError(error, message);
        }
        else
            return new EMSessionError(null, 'Internal session error');
    }
    manageDocumentCreation(document) {
        document.created = new Date();
        document.deferredDeletion = false;
    }
    manageDocumentUpdate(document) {
        document.modified = new Date();
    }
    manageDocumentDeletion(document) {
        document.deleted = new Date();
        document.deferredDeletion = true;
    }
    resolveToMongoFilters(entityName, filters) {
        let info = this.entitiesInfo.find(f => f.name == entityName).info;
        let persistentMembers = info.getAllMembers().filter(m => (m instanceof hcMetaData_1.AccessorInfo) && m.schema != null).map(m => { return { property: m.name, type: m.type }; });
        //Filter for defferred deletion.
        let mongoFilters;
        // Convert all the fixed and optional filters in Mongoose Filetrs
        if (filters != null && filters.length > 0) {
            //mongoFilters = { $and : [ { deferredDeletion: { $in: [null, false] } } ] };  
            mongoFilters = { $and: [{ deferredDeletion: false }] };
            let opFilters = [];
            let errFilters;
            //get all filters
            for (let filter of filters) {
                let pMember = persistentMembers.find(pm => pm.property == filter.property);
                if (pMember == null) {
                    errFilters = 'Attempt to filter by a non persistent member';
                    break;
                }
                //Single mongo filter
                let mongoFilterConversion = this.parseMongoFilter(filter, pMember.type);
                if (mongoFilterConversion.err) {
                    errFilters = mongoFilterConversion.message;
                    break;
                }
                if (filter.filterType == FilterType.Fixed)
                    mongoFilters.$and.push(mongoFilterConversion.value);
                if (filter.filterType == FilterType.Optional)
                    opFilters.push(mongoFilterConversion.value);
            }
            if (opFilters.length > 0) {
                if (opFilters.length > 1)
                    mongoFilters.$and.push({ $or: opFilters });
                else
                    mongoFilters.$and.push(opFilters[0]);
            }
            if (errFilters != null)
                return { error: true, message: errFilters };
        }
        else {
            //mongoFilters = { deferredDeletion: { $in: [null, false] }  };
            mongoFilters = { deferredDeletion: false };
        }
        return { error: false, filters: mongoFilters };
    }
    parseMongoFilter(f, propertyType) {
        //Check and convert the filter value 
        let valueFilter; //value to mongo query
        switch (propertyType) {
            case 'Number':
                if (isNaN(f.value))
                    return { err: true, message: `The value for a filter in the property "${f.property}" must be a number` };
                else
                    valueFilter = parseInt(f.value);
                break;
            default:
                valueFilter = f.value;
        }
        ;
        //Set the table of conversions for filters and mongo filters 
        let configConvesions = [
            { operators: ['=', 'eq'] },
            { operators: ['<>', 'ne'], mongoOperator: '$ne' },
            { operators: ['>=', 'gte'], mongoOperator: '$gte', filterTypes: ['Number', 'Date'], },
            { operators: ['<=', 'lte'], mongoOperator: '$lte', filterTypes: ['Number', 'Date'] },
            { operators: ['>', 'gt'], mongoOperator: '$gt', filterTypes: ['Number', 'Date'] },
            { operators: ['<', 'lt'], mongoOperator: '$lt', filterTypes: ['Number', 'Date'] },
            { operators: ['lk'], mongoOperator: '$regex', filterTypes: ['String'], valueModifier: (v) => { return '.*' + v + '.*'; } }
        ];
        //Make the conversion 
        let confIndex = -1;
        let conf = configConvesions.find(cc => cc.operators.find(o => o == f.operator) != null);
        if (conf != null) {
            valueFilter = conf.valueModifier != null ? conf.valueModifier(valueFilter) : valueFilter;
            if (conf.filterTypes == null || (conf.filterTypes != null && conf.filterTypes.find(at => at == propertyType) != null)) {
                let value;
                if (conf.mongoOperator)
                    value = { [f.property]: { [conf.mongoOperator]: valueFilter } };
                else
                    value = { [f.property]: valueFilter };
                return { err: false, value };
            }
            else
                return { err: true, message: `It is not possible to apply the the operator "${f.operator}" to the property "${f.property}" because it is of type "${propertyType}"` };
        }
        else
            return { err: true, message: `Not valid operator ${f.operator} for filtering` };
    }
    resolveToMongoSorting(entityName, sorting) {
        if (sorting != null && sorting.length > 0) {
            let info = this.entitiesInfo.find(f => f.name == entityName).info;
            let persistentMembers = info.getAllMembers().filter(m => (m instanceof hcMetaData_1.AccessorInfo) && m.schema != null).map(m => { return { property: m.name, type: m.type }; });
            let errSorting;
            let mongoSorting = {};
            for (let sort of sorting) {
                let pMember = persistentMembers.find(pm => pm.property == sort.property);
                if (pMember == null) {
                    errSorting = 'Attempt to sort by a non persistent member';
                    break;
                }
                let mst;
                if (sort.sortType == SortType.ascending)
                    mst = 'asc';
                if (sort.sortType == SortType.descending)
                    mst = 'desc';
                mongoSorting[sort.property] = mst;
            }
            if (errSorting != null)
                return { error: true, message: errSorting };
            return { error: false, sorting: mongoSorting };
        }
        else
            return null;
    }
    throwException(message) {
        if (this._devMode)
            console.error('DEV-MODE: ' + message);
        else
            throw new Error(message);
    }
    throwInfo(message, warnDevMode) {
        warnDevMode = warnDevMode != null ? warnDevMode : true;
        if (warnDevMode && this._devMode)
            console.warn('DEV-MODE: ' + message);
        else
            console.info(message);
    }
}
exports.EMSession = EMSession;
class EMSessionError {
    constructor(error, message) {
        this.error = error;
        this.message = message;
    }
}
exports.EMSessionError = EMSessionError;
var FilterType;
(function (FilterType) {
    FilterType[FilterType["Fixed"] = 1] = "Fixed";
    FilterType[FilterType["Optional"] = 2] = "Optional";
})(FilterType || (FilterType = {}));
exports.FilterType = FilterType;
var SortType;
(function (SortType) {
    SortType[SortType["ascending"] = 1] = "ascending";
    SortType[SortType["descending"] = 2] = "descending";
})(SortType || (SortType = {}));
exports.SortType = SortType;
//# sourceMappingURL=emSession.js.map