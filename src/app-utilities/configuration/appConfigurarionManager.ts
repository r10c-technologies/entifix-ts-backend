import { EMSession } from "../../express-mongoose/emSession/emSession"
import { AppConfiguration, IAppConfigurationModel } from "./appConfiguration";
import { getAppConfigurationMetadata } from "./app-configuration-metadata";


class AppConfigurationManager
{
    //#region Properties
    
    private _session : EMSession;
    
    //#endregion

    //#region methods

    constructor( session : EMSession ) {
        this._session = session;
    }

    get<T>(configType : { new() : T }) : Promise<T>
    {
        let appConfigMetadata = getAppConfigurationMetadata(configType);

        if (appConfigMetadata){
            //First: check for environment values if necessary
            if (appConfigMetadata.options.envValue && process.env[appConfigMetadata.options.envValue])
                return Promise.resolve(process.env[appConfigMetadata.options.envValue] as any);
            
            //Second: check for database of default value
            let filter : any = { name: appConfigMetadata.name };
            if (appConfigMetadata.options && appConfigMetadata.options.group)
                filter.group = appConfigMetadata.options.group;

            return this._session
                        .listEntitiesByQuery<AppConfiguration, IAppConfigurationModel>(AppConfiguration.getInfo(), filter)
                        .then( results => {
                            if (results && results.length > 0)
                                return results[0].value as T;
                            else if (appConfigMetadata.options.defaultValue)
                                return appConfigMetadata.options.defaultValue as T;
                            else
                                return null;
                        });
        }
        else
            return Promise.reject("No configuration metadata");
    }

    set<T>(configType : { new() : T }, value : T) : Promise<void>
    {
        let appConfigMetadata = getAppConfigurationMetadata(configType);
        
        if (appConfigMetadata)
            return new Promise<void>((resolve,reject) => {
                let filter : any = { name: appConfigMetadata.name };
                if (appConfigMetadata.options && appConfigMetadata.options.group)
                    filter.group = appConfigMetadata.options.group;

                this._session
                    .listEntitiesByQuery<AppConfiguration, IAppConfigurationModel>(AppConfiguration.getInfo(), filter)
                    .then( results => {
                        if (results && results.length > 0)
                            this._session
                                .getModel<IAppConfigurationModel>('AppConfiguration')
                                .findByIdAndUpdate(results[0]._id, { value }, null, (err, result) => {
                                    if (!err) 
                                        resolve();
                                    else
                                        reject(err);
                                });
                        else 
                            new AppConfiguration(this._session)
                                .setName(appConfigMetadata.name)
                                .setDescription(appConfigMetadata.options.description)
                                .setGroup(appConfigMetadata.options.group)
                                .setUserManagement(appConfigMetadata.options.userManagement)
                                .setDisplayName(appConfigMetadata.options.displayName)
                                .setValue(value)
                                .save()
                                .then( result => {
                                        if (result.continue)
                                            resolve();
                                        else
                                            reject(`Entity Movement Flow as Exception: ${result.message}`);
                                    })
                                .catch(reject);
                    }).catch(reject);
            });
        else
            return Promise.reject("No configuration metadata");
    }



    //#endregion

    //#region Accessors

    get session()
    { return this._session; }

    //#endregion
}




export {
    AppConfigurationManager
}
