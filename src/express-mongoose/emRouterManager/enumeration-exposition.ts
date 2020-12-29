import { EMSimpleController } from "./emRouterManager";
import { Wrapper } from "../../hc-core/hcWrapper/hcWrapper";


function createEnumController( name: string, enumerator : any ) : EMSimpleController;
function createEnumController( name: string, enumerator : any, options : ExposeEnumerationOptions ) : EMSimpleController;
function createEnumController( name: string, enumerator : any, options? : ExposeEnumerationOptions ) : EMSimpleController
{
    let resourceName = options && options.resourceName ? options.resourceName : name.toLowerCase();
    let newController = new EMSimpleController(this, resourceName);

    let keys = Object.keys( enumerator );

    let arrayToExpose = new Array <{ id:any, value:any, criteria?: any }>();
    
    let getValueToExpose = (k,v) => {
        let valueToExpose = v;
        if (options && options.aliasSet && options.aliasSet.has(k)) 
            valueToExpose = options.aliasSet.get(k);
        return valueToExpose;
    };

    let getCriteriaToExpose = k => {
        if (options && options.exposeCriteria && options.exposeCriteria.has(k))
            return options.exposeCriteria.get(k);
        else
            return null;
    };

    keys.forEach( k => { 
        if (arrayToExpose.find(pair => pair.value == k) == null)
            arrayToExpose.push({ id: k, value: getValueToExpose(k, enumerator[k]), criteria: getCriteriaToExpose(k) });
    });
    
    newController.retrieveMethod = ( req, res, next ) =>{
        let equalFilters = new Map<string,string>();
        let devData = null;

        let addDevData = i => {
            if (!devData)
                devData = { queryInconsistencies: [] };
            devData.queryInconsistencies.push( {
                details: i,
                message: 'Not allowed filters'
            }); 
        };

        if (req.query) 
            for ( let p in req.query ) 
                switch(p) {
                    case 'fixed_filter':
                        let queryValue = req.query[p];
                        let extractFilter = ( v ) => { 
                            let av = v.split('|');
                            if (av.length == 3 && (av[1] == 'eq' || av[1] == '='))
                                return { key: av[0], value: av[2] };
                            else 
                                addDevData(v);
                        };

                        if (queryValue instanceof Array) { 
                            (queryValue as Array<any>).map(extractFilter).filter( f => f != null ).forEach( f => equalFilters.set(f.key, f.value) );
                        }
                        else {
                            let f = extractFilter(queryValue);
                            if (f) equalFilters.set(f.key,f.value);
                        }
                        
                        break;

                    default:
                        addDevData({ [p]: req.query[p] });
                }

        if (options && options.fixedExposedCriteria)
            equalFilters.set('criteria', options.fixedExposedCriteria);
            
        let filteredArray = [];
        for (let element of arrayToExpose.filter( e => e != null)) {
            let includeElement = true;
            for (let filterKey of equalFilters.keys()) 
                if (element[filterKey] != equalFilters.get(filterKey)) {
                    includeElement = false;
                    break;
                }                    
            if (includeElement)
                filteredArray.push(element);
        }
        
        res.send( Wrapper.wrapCollection(false, null, filteredArray, { devData } ).serializeSimpleObject() ); 
    }

    newController.retrieveByIdMethod = ( req, res, next) => {
        let id = req.params._id;
        let objectToExpose = arrayToExpose.find( v => v.id == id );
        res.send( Wrapper.wrapObject( false, null , objectToExpose).serializeSimpleObject() );
    }

    newController.createRoutes();

    return newController;
}


interface ExposeEnumerationOptions
{ 
    basePath? : string, 
    resourceName? : string, 
    aliasSet?: Map<string, string>,
    exposeCriteria?: Map<string, string>
    fixedExposedCriteria?: string 
}

export {
    createEnumController,
    ExposeEnumerationOptions
}