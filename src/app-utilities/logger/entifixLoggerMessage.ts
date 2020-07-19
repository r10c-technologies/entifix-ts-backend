/**
 * Logger Message structure.
 */
interface EntifixLoggerMessage {
    /** @description System Owner property contains the name of the system owner that trigger the log. */
    systemOwner?: string,
    /** @description User property contains the name of the user that trigger the log. */
    user?: string,
    /** @description Message property contains the body text of the log. */
    message: string,
    /** @description Origin property contains the name of the file that trigger the log. */
    origin?: EntifixLoggerMessageOrigin,
    /** @description Developer property contains the name of the developer that code the function that trigger the log. */
    developer?: string,
    /** @description AditionalData property contains extra arguments that could be useful for information. */
    aditionalData?: any
    /** @description Type property shows the log level. */
}

/**
 * Structure of the origin logger
 */
interface EntifixLoggerMessageOrigin {
    /** @description File name where the log has been triggered. */
    file?: string,
    /** @description Class name when a file contains multiple classes. */
    class?: string,
    /** @description Method where the log has been triggered. */
    method?: string,
    /** @description Line number where the log has been triggered. */
    lineNumber?: string
}

export { 
    EntifixLoggerMessage,
    EntifixLoggerMessageOrigin
}