"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//CORE FRAMEWORK
const hcSession_1 = require("../../hc-core/hcSession/hcSession");
const hcMetaData_1 = require("../../hc-core/hcMetaData/hcMetaData");
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
            //Set mongo filters attending options.
            //First Monto object or SessionFilters instead
            let mongoFilters = options != null && options.mongoFilters ? options.mongoFilters : null;
            if (!mongoFilters)
                mongoFilters = this.resolveToMongoFilters(entityName, options != null && options.filters != null ? options.filters : null);
            if (mongoFilters.error) {
                let errorData = {
                    helper: 'Error ocurred on filters validation',
                    details: mongoFilters.message
                };
                let error = this.createError(errorData, null);
                error.setAsHandledError(400, 'Bad Query Param');
                reject(error);
            }
            let mongoSorting = this.resolveToMongoSorting(entityName, options != null && options.sorting != null ? options.sorting : null);
            if (mongoSorting != null && mongoSorting.error) {
                let errorData = {
                    helper: 'Error ocurred on sorting params validation',
                    details: mongoFilters.message
                };
                let error = this.createError(errorData, null);
                error.setAsHandledError(400, 'Bad Query Param');
                reject(error);
            }
            //CREATE QUERY =====>>>>>
            let query = this.getModel(entityName).find(mongoFilters.filters);
            let countQuery = query.skip(0);
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
                        let details = { total: count };
                        if (skip > 0)
                            details.skip = skip;
                        if (take != null)
                            details.take = take;
                        resolve({ docs: results, details });
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
            let filters = { $and: [{ deferredDeletion: { $in: [null, false] } }] };
            if (mongoFilters instanceof Array)
                filters.$and = filters.$and.concat(mongoFilters);
            else
                filters.$and.push(mongoFilters);
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
        let persistentMembers = info.getAllMembers()
            .filter(m => (m instanceof hcMetaData_1.AccessorInfo) && (m.schema != null || m.persistenceType == hcMetaData_1.PersistenceType.Auto))
            .map(m => {
            return { property: m.name, type: m.type, serializeAlias: m.serializeAlias, persistentAlias: m.persistentAlias };
        });
        //Base mongo filters
        let mongoFilters;
        // Convert all the fixed and optional filters in Mongoose Filetrs
        if (filters != null && filters.length > 0) {
            mongoFilters = { $and: [{ deferredDeletion: { $in: [null, false] } }] };
            // mongoFilters = { $and : [ { deferredDeletion: false } ] };
            let opFilters = [];
            let errFilters;
            //get all filters
            for (let filter of filters) {
                let pMember = persistentMembers.find(pm => pm.property == filter.property || pm.serializeAlias == filter.property || pm.persistentAlias == filter.property);
                if (pMember == null) {
                    errFilters = 'Attempt to filter by a non persistent member';
                    break;
                }
                //Single mongo filter
                let persistentName = pMember.persistentAlias ? pMember.persistentAlias : pMember.property;
                let mongoFilterConversion = this.parseMongoFilter(filter, pMember.type, persistentName);
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
            mongoFilters = { deferredDeletion: { $in: [null, false] } };
            // mongoFilters = { deferredDeletion: false };
        }
        return { error: false, filters: mongoFilters };
    }
    parseMongoFilter(sessionFilter, propertyType, persistentName) {
        //Check and convert the filter value 
        let valueFilter; //value to mongo query
        switch (propertyType) {
            case 'Number':
                if (isNaN(sessionFilter.value))
                    return { err: true, message: `The value for a filter in the property "${persistentName}" must be a number` };
                else
                    valueFilter = parseInt(sessionFilter.value);
                break;
            case 'Date':
                let tempTimeStamp = Date.parse(sessionFilter.value);
                if (isNaN(tempTimeStamp) == false)
                    valueFilter = sessionFilter.value; //new Date(tempTimeStamp); Bug with mongo query
                else
                    return { err: true, message: `The value for a filter in the property "${persistentName}" must be a date` };
                break;
            default:
                valueFilter = sessionFilter.value;
        }
        ;
        //Set the table of conversions for filters and mongo filters 
        //Value modifiers        
        let likeModifier = value => { return '.*' + value + '.*'; };
        let configConvesions = [
            { operators: ['=', 'eq'] },
            { operators: ['<>', 'ne'], mongoOperator: '$ne' },
            { operators: ['>=', 'gte'], mongoOperator: '$gte', filterTypes: ['Number', 'Date'], },
            { operators: ['<=', 'lte'], mongoOperator: '$lte', filterTypes: ['Number', 'Date'] },
            { operators: ['>', 'gt'], mongoOperator: '$gt', filterTypes: ['Number', 'Date'] },
            { operators: ['<', 'lt'], mongoOperator: '$lt', filterTypes: ['Number', 'Date'] },
            { operators: ['lk'], mongoOperator: '$regex', filterTypes: ['String'], valueModifier: likeModifier }
        ];
        //Make the conversion 
        let confIndex = -1;
        let conf = configConvesions.find(cc => cc.operators.find(o => o == sessionFilter.operator) != null);
        if (conf != null) {
            valueFilter = conf.valueModifier != null ? conf.valueModifier(valueFilter) : valueFilter;
            if (conf.filterTypes == null || (conf.filterTypes != null && conf.filterTypes.find(at => at == propertyType) != null)) {
                let value;
                if (conf.mongoOperator)
                    value = { [persistentName]: { [conf.mongoOperator]: valueFilter } };
                else
                    value = { [persistentName]: valueFilter };
                return { err: false, value };
            }
            else
                return { err: true, message: `It is not possible to apply the the operator "${sessionFilter.operator}" to the property "${persistentName}" because it is of type "${propertyType}"` };
        }
        else
            return { err: true, message: `Not valid operator ${sessionFilter.operator} for filtering` };
    }
    resolveToMongoSorting(entityName, sorting) {
        if (sorting != null && sorting.length > 0) {
            let info = this.getInfo(entityName);
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