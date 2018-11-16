



interface TokenValidationResponse
{
    error? : any,
    success: boolean,
    message?: string,
    privateUserData?: PrivateUserData
}

interface TokenValidationRequest
{
    token: string,
    path: string
    service: string,
}

interface PrivateUserData
{
    systemOwner: string,
    userName: string, 
    name: string, 
    idUser: string
}

interface PublicUserData
{
    idUser: string,
    userName: string,
    name: string
}


export { PublicUserData, PrivateUserData, TokenValidationRequest, TokenValidationResponse }



