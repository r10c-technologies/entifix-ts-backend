import { EMServiceSession } from "../../express-mongoose/emServiceSession/emServiceSession";
import { AppConfiguration, IAppConfigurationModel } from "./appConfiguration";
import { EMRouterManager } from "../../express-mongoose/emRouterManager/emRouterManager";
import { AppConfigurationController } from "./appConfigurationController";

const DefinedAppConfigurationMetaKey = Symbol('DefinedAppConfigurationMetaKey');

function DefinedAppConfiguration( );
function DefinedAppConfiguration( options : DefinedAppConfigurationOptions );
function DefinedAppConfiguration( options? : DefinedAppConfigurationOptions )
{
    return function( target: Function) {        
        
        options = options || { userManagement: false };

        let metadataObject : AppConfigurationMetadata = {
            name: target.name,
            options
        };

        Reflect.defineMetadata(DefinedAppConfigurationMetaKey, metadataObject, target);
        AppConfigurationMetadataSet.addConfigurationElement(metadataObject);

        assertDefinition();
    }
}

function getAppConfigurationMetadata(target : any) : AppConfigurationMetadata 
{
    return Reflect.getMetadata(DefinedAppConfigurationMetaKey, target) as AppConfigurationMetadata;;
}




// Annotation internal logic
// ========================================================================================================================================


class AppConfigurationMetadataSet
{
    //#region static

    private static _configurationList : Array<AppConfigurationMetadata>;

    static addConfigurationElement( configElement : AppConfigurationMetadata ) 
    {
        if (!this._configurationList)
            this._configurationList = new Array<AppConfigurationMetadata>();
        this._configurationList.push(configElement);
    }

    static getUserAdminConfiguraions() : Array<AppConfigurationMetadata> 
    {
        if (this._configurationList) 
            return this._configurationList.filter( conf => conf.options.userManagement );
    }

    static get configurationList()
    { return this._configurationList }

    //#endregion
}



interface DefinedAppConfigurationOptions
{
    description?: string;
    group?: string
    defaultValue?: any;
    userManagement?: boolean;
    display?: string
}

interface AppConfigurationMetadata
{
    name: string;
    options : DefinedAppConfigurationOptions;
}

function assertDefinition() : void
{
    let createDefinition = (ss : EMServiceSession) => {
        if (!(ss.entitiesInfo && ss.entitiesInfo.find( info => info.info.name == AppConfiguration.getInfo().name )))
            ss.registerEntity<IAppConfigurationModel, AppConfiguration>(AppConfiguration, AppConfiguration.getInfo());
            
        EMServiceSession.on('routerManagerStarted', (routerManager: EMRouterManager)=> {
            routerManager.exposeEntity('AppConfiguration', { controller: new AppConfigurationController(routerManager) } );
        });
    };

    if (!EMServiceSession.instance) 
        EMServiceSession.on('serviceSessionConnected', () => createDefinition( EMServiceSession.instance ));
    else 
        createDefinition(EMServiceSession.instance);    
}



export {
    DefinedAppConfiguration,
    DefinedAppConfigurationOptions,
    getAppConfigurationMetadata,
    AppConfigurationMetadata, 
    AppConfigurationMetadataSet
}

