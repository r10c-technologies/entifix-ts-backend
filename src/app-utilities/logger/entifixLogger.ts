import EntifixLoggerLevel from './entifixLoggerLevels';
import EntifixLoggerMessage from './entifixLoggerMessage';

/**
 * Contains the implementation of the entifix logger
 */
class EntifixLogger {
    /**
     * The current level of the logger.
     */
    private static _level: EntifixLoggerLevel = EntifixLoggerLevel.INFO;

    /**
     * @param level New logger level.
     * @typeParam EntifixLoggerLevel.
     * @returns The function doesn't return any value.
     */
    static setLevel(level: EntifixLoggerLevel): void {
        this._level = level;
    }

    /**
     * @returns Evaluates if all logger levels are enabled.
     */
    static areAllLogsEnabled(): boolean {
        return this._level === EntifixLoggerLevel.ALL;
    }

    /**
     * @returns Evaluates if all logger levels are disabled.
     */
    static areAllLogsDisabled(): boolean {
        return this._level === EntifixLoggerLevel.OFF;
    }

    /**
     * @param level Logger level to evaluate.
     * @typeParam EntifixLoggerLevel.
     * @returns Evaluates if the specific logger level is enabled.
     */
    static canPrintLog(level: EntifixLoggerLevel): boolean {
        if (this.areAllLogsDisabled()) {
            return false;
        } else if (this.areAllLogsEnabled()) {
            return true;
        } else {
            switch (level) {
                case EntifixLoggerLevel.TRACE: {
                    return this._level === EntifixLoggerLevel.TRACE;
                }
                case EntifixLoggerLevel.DEBUG: {
                    return this._level === EntifixLoggerLevel.TRACE || this._level === EntifixLoggerLevel.DEBUG;
                }
                case EntifixLoggerLevel.INFO: {
                    return this._level === EntifixLoggerLevel.TRACE || this._level === EntifixLoggerLevel.DEBUG
                        || this._level === EntifixLoggerLevel.INFO;
                }
                case EntifixLoggerLevel.WARN: {
                    return this._level === EntifixLoggerLevel.TRACE || this._level === EntifixLoggerLevel.DEBUG
                        || this._level === EntifixLoggerLevel.INFO || this._level === EntifixLoggerLevel.WARN;
                }
                case EntifixLoggerLevel.ERROR: {
                    return this._level === EntifixLoggerLevel.TRACE || this._level === EntifixLoggerLevel.DEBUG
                        || this._level === EntifixLoggerLevel.INFO || this._level === EntifixLoggerLevel.WARN
                        || this._level === EntifixLoggerLevel.ERROR;
                }
                case EntifixLoggerLevel.FATAL: {
                    return this._level === EntifixLoggerLevel.TRACE || this._level === EntifixLoggerLevel.DEBUG
                        || this._level === EntifixLoggerLevel.INFO || this._level === EntifixLoggerLevel.WARN
                        || this._level === EntifixLoggerLevel.ERROR || this._level === EntifixLoggerLevel.FATAL;
                }
            }
        }
    }

    /**
     * @param log Logger message to print.
     * @typeParam EntifixLoggerMessage.
     * @returns The function doesn't return any value.
     */
    static trace(log: EntifixLoggerMessage): void {
        if (this.canPrintLog(EntifixLoggerLevel.TRACE)) {
            console.log(this.printLogMessage(log));
        }
    }

    /**
     * @param log Logger message to print.
     * @typeParam EntifixLoggerMessage.
     * @returns The function doesn't return any value.
     */
    static debug(log: EntifixLoggerMessage): void {
        if (this.canPrintLog(EntifixLoggerLevel.DEBUG)) {
            console.info(this.printLogMessage(log));
        }
    }

    /**
     * @param log Logger message to print.
     * @typeParam EntifixLoggerMessage.
     * @returns The function doesn't return any value.
     */
    static info(log: EntifixLoggerMessage): void {
        if (this.canPrintLog(EntifixLoggerLevel.INFO)) {
            console.info(this.printLogMessage(log));
        }
    }

    /**
     * @param log Logger message to print.
     * @typeParam EntifixLoggerMessage.
     * @returns The function doesn't return any value.
     */
    static warn(log: EntifixLoggerMessage): void {
        if (this.canPrintLog(EntifixLoggerLevel.WARN)) {
            console.warn(this.printLogMessage(log));
        }
    }

    /**
     * @param log Logger message to print.
     * @typeParam EntifixLoggerMessage.
     * @returns The function doesn't return any value.
     */
    static error(log: EntifixLoggerMessage): void {
        if (this.canPrintLog(EntifixLoggerLevel.ERROR)) {
            console.error(this.printLogMessage(log));
        }
    }

    /**
     * @param log Logger message to print.
     * @typeParam EntifixLoggerMessage.
     * @returns The function doesn't return any value.
     */
    static fatal(log: EntifixLoggerMessage): void {
        if (this.canPrintLog(EntifixLoggerLevel.FATAL)) {
            console.error(this.printLogMessage(log));
        }
    }

    /**
     * @param log Logger message to print.
     * @typeParam EntifixLoggerMessage.
     * @returns A formmatted string value to print.
     */
    private static printLogMessage(log: EntifixLoggerMessage): string {
        return JSON.stringify({
            "System Owner": log.systemOwner,
            "User in request": log.user,
            "Message": log.message,
            "Origin":`${log.origin.file ? "File " + log.origin.file : ""}, ${log.origin.method ? "Method " + log.origin.method : ""}, ${log.origin.lineNumber ? "Line number " + log.origin.lineNumber : ""}`,
            "Developer": log.developer
        });
    }
}

export default EntifixLogger;