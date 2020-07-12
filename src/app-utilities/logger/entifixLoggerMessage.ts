/**
 * Logger Message structure.
 */
interface EntifixLoggerMessage {
    /** @description System Owner property contains the name of the system owner that trigger the log. */
    systemOwner: string,
    /** @description User property contains the name of the user that trigger the log. */
    user: string,
    /** @description Message property contains the body text of the log. */
    message: string,
    /** @description Origin property contains the name of the file that trigger the log. */
    origin?: string,
    /** @description Developer property contains the name of the developer that code the function that trigger the log. */
    developer?: string
}

export default EntifixLoggerMessage;