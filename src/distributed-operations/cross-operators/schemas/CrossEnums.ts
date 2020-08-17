
enum SearchOperator 
{
    byKeys = '$byKeys',
    byKey = '$byKey',
    byId = '$byId'
}

enum AssertOperation 
{
    Assert = '$assert',
    NewInstance = '$new',   
}

enum CrossOperationErrorType 
{
    inconsistentData = 'inconsistentData'
} 

export 
{ 
    SearchOperator, 
    AssertOperation, 
    CrossOperationErrorType 
}


