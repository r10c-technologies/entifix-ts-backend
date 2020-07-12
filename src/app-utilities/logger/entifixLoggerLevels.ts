/**
 * Logger levels supported.
 */
enum EntifixLoggerLevel {
    /**
     * @description ALL value prints all logger levels.
     */
    ALL = 'ALL',
    /**
     * @description TRACE value prints TRACE, DEBUG, INFO, WARN, ERROR and FATAL logs.
     */
    TRACE = 'TRACE',
    /**
     * @description DEBUG value prints DEBUG, INFO, WARN, ERROR and FATAL logs.
     */
    DEBUG = 'DEBUG',
    /**
     * @description INFO value prints INFO, WARN, ERROR and FATAL logs.
     */
    INFO = 'INFO',
    /**
     * @description WARN value prints WARN, ERROR and FATAL logs.
     */
    WARN = 'WARN',
    /**
     * @description ERROR value prints ERROR and FATAL logs.
     */
    ERROR = 'ERROR',
    /**
     * @description FATAL value prints only FATAL logs.
     */
    FATAL = 'FATAL',
    /**
     * @description OFF value does not print any logger level.
     */
    OFF = 'OFF'
}

export default EntifixLoggerLevel;