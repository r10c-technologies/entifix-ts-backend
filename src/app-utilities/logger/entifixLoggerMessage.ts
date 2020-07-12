/**
 * Logger Message structure.
 */
interface EntifixLoggerMessage {
    /** @descripion System Owner property contains the name of the system owner that trigger the log. */
    systemOwner: string,
    /** @descripion User property contains the name of the user that trigger the log. */
    user: string,
    /** @descripion Message property contains the body text of the log. */
    message: string,
    /** @descripion Origin property contains the name of the file that trigger the log. */
    origin?: string,
    /** @descripion Developer property contains the name of the developer that code the function that trigger the log. */
    developer?: string
}

export default EntifixLoggerMessage;