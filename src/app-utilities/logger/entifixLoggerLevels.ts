/**
 * Logger levels supported.
 */
enum EntifixLoggerLevel {
    /**
     * @description ALL value prints all logger levels.
     */
    ALL = 'ALL',
    /**
     * @description TRACE value prints only TRACE logs.
     */
    TRACE = 'TRACE',
    /**
     * @description DEBUG value prints TRACE and DEBUG logs.
     */
    DEBUG = 'DEBUG',
    /**
     * @description INFO value prints TRACE, DEBUG and INFO logs.
     */
    INFO = 'INFO',
    /**
     * @description WARN value prints TRACE, DEBUG, INFO and WARN logs.
     */
    WARN = 'WARN',
    /**
     * @description ERROR value prints TRACE, DEBUG, INFO, WARN and ERROR logs.
     */
    ERROR = 'ERROR',
    /**
     * @description FATAL value prints TRACE, DEBUG, INFO, WARN, ERROR and FATAL logs.
     */
    FATAL = 'FATAL',
    /**
     * @description OFF value does not print any logger level.
     */
    OFF = 'OFF'
}

export default EntifixLoggerLevel;