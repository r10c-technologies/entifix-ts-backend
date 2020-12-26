


class CollectionUtilities
{
    //#region Static

    static processSorting<T>(collection : Array<T>, sorting : any) : void
    {
        if (collection && collection.length > 0 && sorting && Object.keys(sorting).length > 0)
            collection.sort( (elementA, elementB) => {
                let sortResult = 0;
                for (let sortProperty in sorting) 
                    if (elementA[sortProperty] != elementB[sortProperty]) 
                    {                    
                        if (sorting[sortProperty] == 'asc')
                            return elementA[sortProperty] < elementB[sortProperty] ? -1 : 1;
                        else if (sorting[sortProperty] == 'desc')
                            return elementA[sortProperty] > elementB[sortProperty] ? -1 : 1;
                                                
                    }            

                return sortResult;
            });
    }

    //#endregion
}

export {
    CollectionUtilities
}
