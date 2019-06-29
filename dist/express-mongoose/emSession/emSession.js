"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("moment");
//CORE FRAMEWORK
const hcSession_1 = require("../../hc-core/hcSession/hcSession");
const hcMetaData_1 = require("../../hc-core/hcMetaData/hcMetaData");
const moment = require("moment");
class EMSession extends hcSession_1.HcSession {
    constructor(serviceSession, options) {
        super();
        this._serviceSession = serviceSession;
        this._request = options.request;
        this._response = options.response;
        let puData = options.privateUserData;
        if (!puData)
            puData = this._request ? this._request.privateUserData : null;
        if (!puData && this._serviceSession.isDevMode)
            puData = this._serviceSession.getDeveloperUserData();
        if (!puData)
            this.serviceSession.throwException('There is no private user data for the session');
        this._privateUserData = puData;
        this._serviceSession.verifySystemOwnerModels(this._privateUserData.systemOwnerSelected);
    }
    getModel(entityName) {
        let info = this.getInfo(entityName);
        let systemOwner = this.serviceSession.allowFixedSystemOwners && info.fixedSystemOwner ? info.fixedSystemOwner : this._privateUserData.systemOwnerSelected;
        return this._serviceSession.getModel(entityName, systemOwner);
    }
    getInfo(entityName) {
        return this._serviceSession.getInfo(entityName);
    }
    createDocument(entityName, document) {
        return new Promise((resolve, reject) => {
            this.manageDocumentCreation(document);
            document.save().then(value => resolve(value), error => reject(this.createError(error, 'Error in create document')));
        });
    }
    updateDocument(entityName, document) {
        return new Promise((resolve, reject) => {
            let model = this.getModel(entityName);
            this.manageDocumentUpdate(document);
            document.update(document, (error, result) => {
                if (!error) {
                    model.findById(document._id, (err, doc) => {
                        if (err)
                            reject(this.createError(err, 'The document was updated but it could not be reloaded'));
                        else
                            resolve(doc);
                    });
                }
                else
                    reject(this.createError(error, 'Error in update document'));
            });
        });
    }
    listDocuments(entityName, options) {
        return new Promise((resolve, reject) => {
            //PREPARE QUERY PARAMETERS =====>>>>>           
            let skip = options != null && options.skip != null ? options.skip : 0;
            let take = options != null && options.take != null ? options.take : null;
            //Result variables
            let inconsistencies;
            let filters = options && options.filters ? options.filters : [];
            if (this._anchoredFiltering) {
                if (this._anchoredFiltering instanceof Array)
                    filters = filters.concat(this._anchoredFiltering);
                else
                    filters.push(this._anchoredFiltering);
            }
            let mongoFilters = this.resolveToMongoFilters(entityName, filters);
            let mongoSorting = this.resolveToMongoSorting(entityName, options != null && options.sorting != null ? options.sorting : null);
            if (mongoFilters.inconsistencies || (mongoSorting != null && mongoSorting.inconsistencies)) {
                inconsistencies = { message: 'Some query params were ignored because of inconsistency' };
                if (mongoFilters.inconsistencies)
                    inconsistencies.filtering = mongoFilters.inconsistencies;
                if (mongoSorting && mongoSorting.inconsistencies)
                    inconsistencies.sorting = mongoSorting.inconsistencies;
            }
            //CREATE QUERY =====>>>>>
            let query = this.getModel(entityName).find(mongoFilters.filters);
            let countQuery = this.getModel(entityName).find(mongoFilters.filters);
            if (mongoSorting != null && mongoSorting.sorting != null)
                query = query.sort(mongoSorting.sorting);
            if (skip > 0)
                query = query.skip(skip);
            if (take != null)
                query = query.limit(take);
            //EXECUTE QUERIES =====>>>>>
            let results;
            let count;
            let lastError;
            let listResolved = false, countResolved = false, fullResolved = false;
            query.exec((err, resultQuery) => {
                if (!err)
                    results = resultQuery;
                else
                    lastError = err;
                listResolved = true;
                if (listResolved && countResolved)
                    resolvePromise();
            });
            countQuery.count((err, resultCount) => {
                if (!err)
                    count = resultCount;
                else
                    lastError = err;
                countResolved = true;
                if (listResolved && countResolved)
                    resolvePromise();
            });
            var resolvePromise = () => {
                if (!fullResolved) {
                    fullResolved = true;
                    if (!lastError) {
                        let result = { docs: results, details: { total: count } };
                        if (skip > 0)
                            result.details.skip = skip;
                        if (take != null)
                            result.details.take = take;
                        if (inconsistencies)
                            result.details.devData = { inconsistencies };
                        resolve(result);
                    }
                    else
                        reject(lastError);
                }
            };
        });
    }
    findDocument(entityName, id) {
        return new Promise((resolve, reject) => {
            this.getModel(entityName).findById(id.trim(), (err, res) => {
                if (!err) {
                    if (res && (res.deferredDeletion == null || res.deferredDeletion == false))
                        resolve(res);
                    else
                        resolve(null);
                }
                else
                    reject(this.createError(err, 'Error in retrive single document'));
            });
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
                    reject(this.createError(error, 'Error in delete document'));
            });
        });
    }
    activateEntityInstance(info, document, options) {
        return new Promise((resolve, reject) => {
            let changes = options && options.changes ? options.changes : [];
            let baseInstace = this._serviceSession.entitiesInfo.find(a => a.name == info.name).activateType(this, document);
            // let entityAccessors = info.getAccessors().filter( a => a.activator != null && ( a.type == "Array" ? baseInstace[a.name] != null && baseInstace[a.name].length > 0 : baseInstace[a.name] != null ) );
            let entityAccessors = info.getAccessors().filter(a => a.activator != null);
            let currentEA = entityAccessors.filter(ea => {
                let persistentName = ea.persistentAlias || ea.name;
                if (ea.type == 'Array')
                    return document[persistentName] != null && document[persistentName].length > 0;
                else
                    return document[persistentName] != null;
            });
            let previousEA = entityAccessors.filter(ea => {
                let persistetName = ea.persistentAlias || ea.name;
                let c = changes.find(c => c.property == persistetName);
                if (c)
                    return c.oldValue != null;
                else
                    return false;
            });
            if (previousEA.length > 0 || currentEA.length > 0) {
                // let promises : Array<Promise<void>> = [];
                let promises = [];
                entityAccessors.forEach(entityAccessor => {
                    let oldValue;
                    if (options && options.changes) {
                        let c = options.changes.find(c => c.property == (entityAccessor.persistentAlias || entityAccessor.name));
                        if (c)
                            oldValue = c.oldValue;
                    }
                    promises.push(entityAccessor.activator.activateMember(baseInstace, this, entityAccessor, { oldValue }).then(change => {
                        if (options && options.changes && options.changes.length > 0) {
                            let nameToMatch = entityAccessor.persistentAlias || entityAccessor.name;
                            let ch = options.changes.find(ch => ch.property == nameToMatch);
                            if (ch) {
                                ch.oldValue = change.oldValue;
                                ch.newValue = change.newValue;
                                ch.property = entityAccessor.name;
                            }
                        }
                    }));
                    //  promises.push(entityAccessor.activator.activateMember( baseInstace, this, entityAccessor));
                });
                Promise.all(promises).then(() => {
                    if (options && options.changes)
                        baseInstace.instancedChanges = options.changes;
                    resolve(baseInstace);
                }, error => reject(this.createError(error, 'Error in create instance of a member')));
            }
            else
                resolve(baseInstace);
        });
    }
    getMetadataToExpose(entityName) {
        let info = this.getInfo(entityName);
        return info.getAccessors().filter(accessor => accessor.exposition).map(accessor => {
            let name = accessor.serializeAlias || accessor.name;
            let type = accessor.activator && accessor.activator.bindingType == hcMetaData_1.MemberBindingType.Reference ? accessor.activator.referenceType : accessor.type;
            let expositionType = accessor.exposition;
            let navigable = accessor.activator ? accessor.activator.extendRoute : false;
            let persistent = (accessor.schema != null || accessor.persistenceType == hcMetaData_1.PersistenceType.Auto);
            return {
                name,
                type,
                expositionType,
                persistent,
                navigable
            };
        });
    }
    findEntity(info, id) {
        return new Promise((resolve, reject) => {
            this.findDocument(info.name, id).then(docResult => this.activateEntityInstance(info, docResult).then(entityInstance => resolve(entityInstance), error => reject(error)), error => reject(error));
        });
    }
    listEntities(entityName, options) {
        return new Promise((resolve, reject) => {
            this.listDocuments(entityName, options).then(results => {
                let entities = new Array();
                let promises = new Array();
                results.docs.forEach(docResult => {
                    promises.push(this.activateEntityInstance(this.getInfo(entityName), docResult).then(entity => { entities.push(entity); }));
                });
                Promise.all(promises).then(() => resolve({ entities, details: results.details }), error => reject(error));
            }, error => reject(error));
        });
    }
    listDocumentsByQuery(entityName, mongoFilters) {
        return new Promise((resolve, reject) => {
            let filters = {};
            let ddFilter = { deferredDeletion: { $in: [null, false] } };
            if (mongoFilters instanceof Array) {
                if (mongoFilters.length > 0)
                    filters.$and = filters.$and = [ddFilter, ...mongoFilters];
                else
                    filters = ddFilter;
            }
            else {
                if (mongoFilters)
                    filters.$and = [ddFilter, mongoFilters];
                else
                    filters = ddFilter;
            }
            this.getModel(entityName).find(filters).then(docs => resolve(docs), err => reject(this.createError(err, 'Error on list documents')));
        });
    }
    listEntitiesByQuery(info, mongoFilters) {
        return new Promise((resolve, reject) => {
            this.listDocumentsByQuery(info.name, mongoFilters).then(docsResult => {
                let entities = new Array();
                let promises = new Array();
                docsResult.forEach(docResult => {
                    promises.push(this.activateEntityInstance(info, docResult).then(entity => { entities.push(entity); }));
                });
                Promise.all(promises).then(() => resolve(entities), error => reject(error));
            });
        });
    }
    findByKey(info, key) {
        return new Promise((resolve, reject) => {
            let normalizedFilter = {
                keys: {
                    serviceName: key.serviceName,
                    entityName: key.entityName,
                    value: key.value
                }
            };
            this.listEntitiesByQuery(info, normalizedFilter).then(entities => {
                if (entities.length > 0)
                    resolve(entities[0]);
                else
                    resolve(null);
            }).catch(err => reject(this.createError(err, 'Error on retrive Entity Multikey')));
        });
    }
    setFiltering(filtering) {
        this._anchoredFiltering = filtering;
    }
    clearFiltering() {
        this._anchoredFiltering = null;
    }
    createError(error, message) {
        return this._serviceSession.createError(error, message);
    }
    manageDocumentCreation(document) {
        document.created = new Date();
        document.deferredDeletion = false;
        document.createdBy = this._privateUserData.idUser;
    }
    manageDocumentUpdate(document) {
        document.modified = new Date();
        document.modifiedBy = this._privateUserData.idUser;
    }
    manageDocumentDeletion(document) {
        document.deleted = new Date();
        document.deferredDeletion = true;
        document.deletedBy = this._privateUserData.idUser;
    }
    resolveToMongoFilters(entityName, filters) {
        let info = this.getInfo(entityName);
        let inconsistencies;
        let addInconsistency = (i) => {
            if (!inconsistencies)
                inconsistencies = new Array();
            inconsistencies.push(i);
        };
        let persistentMembers = info.getAllMembers()
            .filter(m => (m instanceof hcMetaData_1.AccessorInfo) && (m.schema != null || m.persistenceType == hcMetaData_1.PersistenceType.Auto))
            .map(m => { return { property: m.name, type: m.type, serializeAlias: m.serializeAlias, persistentAlias: m.persistentAlias }; });
        //Base mongo filters
        let mongoFilters;
        // Convert all the fixed and optional filters in Mongoose Filetrs
        if (filters != null && filters.length > 0) {
            mongoFilters = { $and: [{ deferredDeletion: { $in: [null, false] } }] };
            let opFilters = [];
            //get all filters
            for (let filter of filters) {
                let pMember = persistentMembers.find(pm => pm.property == filter.property || pm.serializeAlias == filter.property || pm.persistentAlias == filter.property);
                if (pMember) {
                    let persistentName = pMember.persistentAlias ? pMember.persistentAlias : pMember.property;
                    let mongoFilterConversion = this.parseMongoFilter(filter, pMember.type, persistentName);
                    if (!mongoFilterConversion.err) {
                        if (filter.filterType == FilterType.Fixed)
                            mongoFilters.$and.push(mongoFilterConversion.value);
                        if (filter.filterType == FilterType.Optional)
                            opFilters.push(mongoFilterConversion.value);
                    }
                    else
                        addInconsistency({ property: filter.property, message: mongoFilterConversion.message });
                }
                else
                    addInconsistency({ property: filter.property, message: 'Attempt to filter by a non persistent member' });
            }
            if (opFilters.length > 0) {
                if (opFilters.length > 1)
                    mongoFilters.$and.push({ $or: opFilters });
                else
                    mongoFilters.$and.push(opFilters[0]);
            }
        }
        else
            mongoFilters = { deferredDeletion: { $in: [null, false] } };
        return { filters: mongoFilters, inconsistencies };
    }
    parseMongoFilter(sessionFilter, propertyType, persistentName) {
        //Check and convert the filter value 
        let valueFilter; //value to mongo query
        //Format or adjust filter value
        switch (propertyType) {
            case 'Number':
                if (isNaN(sessionFilter.value))
                    return { err: true, message: `The value for a filter in the property "${persistentName}" must be a number` };
                else
                    valueFilter = parseInt(sessionFilter.value);
                break;
            case 'Date':
                if (sessionFilter.operator == 'lk') {
                    let dateFiltering = this.checkPossibleDate(sessionFilter.value);
                    if (!dateFiltering.error)
                        valueFilter = { $gte: dateFiltering.minDate.toISOString(), $lt: dateFiltering.maxDate.toISOString() };
                    else
                        return { err: true, message: `The value for a filter in the property [${persistentName}] must be a date` };
                }
                else {
                    let tempTimeStamp = Date.parse(sessionFilter.value);
                    if (isNaN(tempTimeStamp) == false) {
                        // valueFilter = sessionFilter.value; //new Date(tempTimeStamp); Bug with mongo query
                        valueFilter = new Date(sessionFilter.value).toISOString();
                    }
                    else
                        return { err: true, message: `The value for a filter in the property [${persistentName}] must be a date` };
                }
                break;
            case 'String':
                if (sessionFilter.operator == 'lk')
                    valueFilter = { '$regex': new RegExp(sessionFilter.value, "i") };
                else
                    valueFilter = sessionFilter.value;
                break;
            default:
                valueFilter = sessionFilter.value;
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
            { operators: ['lk'], filterTypes: ['String', 'Date'] }
        ];
        //Make the conversion         
        let conf = configConvesions.find(cc => cc.operators.find(o => o == sessionFilter.operator) != null);
        if (conf != null) {
            if (conf.filterTypes == null || (conf.filterTypes != null && conf.filterTypes.find(at => at == propertyType) != null)) {
                let value;
                if (conf.mongoOperator)
                    value = { [persistentName]: { [conf.mongoOperator]: valueFilter } };
                else
                    value = { [persistentName]: valueFilter };
                return { err: false, value };
            }
            else
                return { err: true, message: `It is not possible to apply the the operator [${sessionFilter.operator}] to the property [${persistentName}] because it is of type "${propertyType}"` };
        }
        else
            return { err: true, message: `Not valid operator ${sessionFilter.operator} for filtering` };
    }
    resolveToMongoSorting(entityName, sorting) {
        if (sorting != null && sorting.length > 0) {
            let info = this.getInfo(entityName);
            let persistentMembers = info.getAllMembers().filter(m => (m instanceof hcMetaData_1.AccessorInfo) && m.schema != null).map(m => { return { property: m.name, type: m.type }; });
            let inconsistencies;
            let addInconsistency = (i) => {
                if (!inconsistencies)
                    inconsistencies = new Array();
                inconsistencies.push(i);
            };
            let mongoSorting = {};
            for (let sort of sorting) {
                let pMember = persistentMembers.find(pm => pm.property == sort.property);
                if (pMember) {
                    let mst;
                    if (sort.sortType == SortType.ascending)
                        mst = 'asc';
                    if (sort.sortType == SortType.descending)
                        mst = 'desc';
                    mongoSorting[sort.property] = mst;
                }
                else
                    addInconsistency({ property: sort.property, message: 'Attempt to sort by a non persistent member' });
            }
            return { sorting: mongoSorting, inconsistencies };
        }
        else
            return null;
    }
    checkPossibleDate(possibleDate) {
        let separators = ['-', '/', '.'];
        let dateArrayString = new Array();
        let dateArrayNumber;
        separators.forEach(s => {
            let pa = possibleDate.split(s);
            if (pa.length > dateArrayString.length)
                dateArrayString = pa;
        });
        if (dateArrayString.filter(e => isNaN(e)).length > 0)
            return { error: true };
        dateArrayNumber = dateArrayString.map(e => parseInt(e));
        if (dateArrayNumber.filter(e => e < 0).length > 0)
            return { error: true };
        if (dateArrayNumber.length > 0 && dateArrayNumber.length <= 3) {
            let year, month, day;
            switch (dateArrayNumber.length) {
                case 3:
                    if (dateArrayNumber[0] > 31) {
                        year = dateArrayNumber[0];
                        month = dateArrayNumber[1];
                        day = dateArrayNumber[2];
                    }
                    else {
                        year = dateArrayNumber[2];
                        month = dateArrayNumber[1];
                        day = dateArrayNumber[0];
                    }
                    break;
                case 2:
                    if (dateArrayNumber[0] > 12) {
                        year = dateArrayNumber[0];
                        month = dateArrayNumber[1];
                    }
                    else {
                        year = dateArrayNumber[1];
                        month = dateArrayNumber[0];
                    }
                    break;
                case 1:
                    year = dateArrayNumber[0];
                    break;
            }
            ;
            if (year < 100)
                year += 2000;
            if (month > 12)
                return { error: true };
            let minMonth, maxMonth, minDay, maxDay;
            let minDate, maxDate;
            if (!month) {
                minMonth = 1;
                maxMonth = 12;
            }
            else
                minMonth = maxMonth = month;
            if (!day) {
                minDate = new Date(year, minMonth - 1, 1);
                maxDate = moment(new Date(year, maxMonth - 1, 1)).add(1, 'month').toDate();
            }
            else {
                minDate = new Date(year, minMonth - 1, day);
                maxDate = new Date(year, maxMonth - 1, day);
            }
            if (!isNaN(minDate.valueOf()) && !isNaN(maxDate.valueOf()))
                return { error: false, minDate, maxDate };
            else
                return { error: true };
        }
        else
            return { error: true };
    }
    publishAMQPMessage(eventName, data) {
        this._serviceSession.publishAMQPMessage(this, eventName, data);
    }
    publishAMQPAction(methodInfo, entityId, data) {
        this._serviceSession.publishAMQPAction(this, methodInfo, entityId, data);
    }
    throwException(message) {
        this._serviceSession.throwException(message);
    }
    throwInfo(message, warnDevMode) {
        warnDevMode = warnDevMode != null ? warnDevMode : true;
        this._serviceSession.throwInfo(message, warnDevMode);
    }
    //#endregion
    //#region Accessors (Properties)
    get request() { return this._request; }
    get response() { return this._response; }
    get userName() { return this._privateUserData.userName; }
    get systemOwner() { return this._privateUserData.systemOwnerSelected; }
    get userCompleteName() { return this._privateUserData.name; }
    get serviceSession() { return this._serviceSession; }
    get privateUserData() { return this._privateUserData; }
}
exports.EMSession = EMSession;
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