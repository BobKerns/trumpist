/*
 * Copyright (c) 2018 Bob Kerns.
 */

/**
 * Logging confguration and setup.
 */

/**
 * We accept either a string, or a function that produces a string. If it's a function,
 * we only call it if logging is enabled.
 */
export type LogMessage = string | (() => string);
/**
 * Our logging, configured.
 */
const { createLogger, format, transports } = require('winston');


export interface Logger {
    trace(msg: LogMessage): void
    debug(msg: LogMessage): void
    info(msg: LogMessage): void
    warn(msg: LogMessage): void
    error(msg: LogMessage): void
    severe(msg: LogMessage): void
}

const LOGGERS: {[k:string]: Logger} = {};

/**
 * Create a named loggers
 * @param key the name for the logger
 * @returns the logger fo the specified key.
 */
export function create(key: string) : Logger {
    return LOGGERS[key] || (LOGGERS[key] = createNew(key));
}

type LoggerInfo = {label: string, message: string, [k: string]: any};
const myFormat = format.printf((info: LoggerInfo) => {
    return `[${info.label}] ${info.level}: ${info.message}`;
});

/**
 * Create a new logger and configure
 * @param key the name for the logger
 */
function createNew(key: string): Logger {
    return createLogger({
        format: format.combine(
            format.colorize(),
            format.label({label: key}),
            myFormat
        ),
        transports: [new transports.Console()]
    });
}