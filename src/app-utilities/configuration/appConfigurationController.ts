import { Request, Response, NextFunction } from 'express';

import { AppConfigurationMetadataSet } from './app-configuration-metadata';
import { IAppConfigurationModel, AppConfiguration } from "./appConfiguration";
import { EMEntityController } from '../../express-mongoose/emEntityController/emEntityController';
import { EMRouterManager } from '../../express-mongoose/emRouterManager/emRouterManager';
import { BAD_REQUEST, NOT_FOUND, NO_CONTENT } from 'http-status-codes';




class AppConfigurationController extends EMEntityController<IAppConfigurationModel, AppConfiguration>
{
    //#region Properties

    //#endregion


    //#region Methods

    constructor(routerManager : EMRouterManager) {
        super('AppConfiguration', routerManager, {resourceName: 'app-configuration'});
    }

    createRoutes() 
    {
        this.router.get('/' + this.resourceName + '/user-management/:id', (request, response, next) => this.userManagementRetriveOne(request, response, next) );
        this.router.get('/' + this.resourceName + '/user-management', (request, response, next)=> this.userManagementRetrieve(request, response,next) );
        this.router.post('/' + this.resourceName + '/user-management', (request, response, next) => this.userManagementCreateOrUpdate(request,response,next) );
        
        super.createRoutes();
    }

    userManagementRetriveOne( request : Request, response : Response, next : NextFunction ) : void
    {
        this.createSession(request, response)
            .then( session => { if (session) {
                let id = request.params.id;
                let configList = AppConfigurationMetadataSet.getUserAdminConfiguraions();
                if (configList != null && configList.length > 0) {
                    let matchConfig = configList.find( c => c.name == id);
                    if (matchConfig) {
                        let filter : any = { name: matchConfig.name };
                        if (matchConfig.options.group)
                            filter.group = matchConfig.options.group;

                        session
                            .listEntitiesByQuery<AppConfiguration, IAppConfigurationModel>(AppConfiguration.getInfo(), filter)
                            .then( results => {
                                    if (results && results.length > 0)
                                        this.responseWrapper.entity(response, results[0]); 
                                    else
                                        this.responseWrapper.entity(response, 
                                                new AppConfiguration(session)
                                                        .setName(matchConfig.name)
                                                        .setGroup(matchConfig.options.group)
                                                        .setDescription(matchConfig.options.description)
                                                        .setUserManagement(matchConfig.options.userManagement)
                                                        .setDisplayName(matchConfig.options.displayName)
                                                        .setValue(matchConfig.options.defaultValue)
                                            );
                                })
                            .catch( e => this.responseWrapper.exception(response, e));
                    } 
                    else 
                        session.findEntity<AppConfiguration, IAppConfigurationModel>(AppConfiguration.getInfo(), id)
                                .then( appConfig => {
                                        if (appConfig && appConfig.userManagement) 
                                            this.responseWrapper.entity(response, appConfig);
                                        else
                                            this.responseWrapper.handledError(response, 'No app configuration for user management', NO_CONTENT);
                                    })
                                .catch(e => this.responseWrapper.exception(response, e));                 
                }
                else
                    this.responseWrapper.object(response, null);
            }});
    }

    userManagementRetrieve( request : Request, response : Response, next : NextFunction ) : void
    {
        this.createSession(request, response)
            .then( session => { if (session) {

                let configList = AppConfigurationMetadataSet.getUserAdminConfiguraions();
                if (configList != null && configList.length > 0) 
                    Promise
                        .all(configList.map( config => {
                                let filter : any = { name: config.name };
                                if (config.options.group)
                                    filter.group = config.options.group;
                                
                                return session
                                        .listEntitiesByQuery<AppConfiguration, IAppConfigurationModel>(AppConfiguration.getInfo(), filter)
                                        .then( results => {
                                                if (results && results.length > 0)
                                                    return results[0]; 
                                                else
                                                    return new AppConfiguration(session)
                                                                .setName(config.name)
                                                                .setGroup(config.options.group)
                                                                .setDescription(config.options.description)
                                                                .setUserManagement(config.options.userManagement)
                                                                .setDisplayName(config.options.displayName)
                                                                .setValue(config.options.defaultValue)
                                            });
                            }))
                        .then( entitiesConfig => this.responseWrapper.entityCollection(response, entitiesConfig) )
                        .catch( e => this.responseWrapper.exception(response, e));
                else
                    this.responseWrapper.entityCollection(response, null);
            }});
    }

    userManagementCreateOrUpdate( request : Request, response : Response, next : NextFunction ) {
        this.createSession(request, response)
            .then( session => { if (session) {
                // VALIDATIONS ===========================================================================
                let configName = request.body.name;
                if (!configName) 
                    return this.responseWrapper.handledError(response, 'Incomplete request', BAD_REQUEST, { cause: 'Property [name] is required'});
                
                let configDef = AppConfigurationMetadataSet.configurationList.find( c => c.name == configName);
                if (!configDef)
                    return this.responseWrapper.handledError(response, 'Bad request', BAD_REQUEST, { cause: 'Unknow app configuration for [name]'});
                
                // HANDLING LOGIC ===========================================================================
                let filter : any = { name: configName };
                if (request.body.group)
                    filter.group = request.body.group;
                                
                session
                    .listEntitiesByQuery<AppConfiguration, IAppConfigurationModel>(AppConfiguration.getInfo(), filter)
                    .then( results => {
                            let config : AppConfiguration;
                            if (results && results.length > 0) {
                                config = results[0];
                                config.setValue(request.body.value); // Pending deeper validations for value
                            }
                            else 
                                config = new AppConfiguration(session)
                                            .setName(configDef.name)
                                            .setGroup(configDef.options.group)
                                            .setDescription(configDef.options.description)
                                            .setUserManagement(configDef.options.userManagement)
                                            .setDisplayName(configDef.options.displayName)
                                            .setValue(request.body.value); // Pending deeper validations for value

                            config
                                .save()
                                .then( result => {
                                        if (result.continue)
                                            this.responseWrapper.entity(response, config);
                                        else
                                            this.responseWrapper.logicError(response, result.message);
                                    })
                                .catch( ex => this.responseWrapper.exception(response, ex) );
                        })
                    .catch( ex => this.responseWrapper.exception(response, ex) );
            }});
    } 



    //#endregion


    //#region Accessors

    //#endregion
}

export {
    AppConfigurationController
}