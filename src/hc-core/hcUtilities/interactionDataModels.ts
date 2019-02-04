
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
}

interface PrivateUserData
{
    sessionKey: string,
    idUser: string,
    userName: string, 
    name: string,
    systemOwnerSelected: string,
    isMaster?: boolean,
    systemOwnerDetail? : Array<{ key: string, idSystemOwner: string }>
}

interface PublicUserData
{
    sessionKey: string,
    userName: string,
    name: string
    systemOwner: string
}


export { PublicUserData, PrivateUserData, TokenValidationRequest, TokenValidationResponse }



