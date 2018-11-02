



interface TokenValidation
{
    success: boolean,
    message: string,
    userData: UserData
}

interface UserData
{
    systemOwner: string,
    userName: string, 
    name: string, 
    idUser: string
}


export { UserData, TokenValidation }



