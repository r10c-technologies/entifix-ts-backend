

enum SearchOperator 
{
    byKey = '$byKey',
    byId = '$byId'
}

enum CreateOperation 
{
    newInstance = '$newInstance'
}

enum CrossOperationErrorType {
    inconsistentData = 'inconsistentData'
} 

export { SearchOperator, CreateOperation, CrossOperationErrorType }


