/*
 * Copyright (c) 2018 Bob Kerns.
 */

/**
 * Logging configuration and setup.
 */

/**
 * We accept either a string, or a function that produces a string. If it's a function,
 * we only call it if logging is enabled.
 */

export type LogMessage = string | (() => string);
/**
 * Our logging, configured.
 */

/* tslint:disable-next-line no-var-requires */
const { createLogger, format, transports, addColors } = require('winston');

const levelSpecs = {
    levels: {
        severe: 0,
        error: 1,
        warn: 2,
        info: 3,
        debug: 4,
        trace: 5,
    },
    colors: {
        severe: "bold red yellowBG",
        error: "bold red",
        warn: "red",
        info: "black",
        debug: "blue",
        trace: "dim blue cyanBG",
    },
};

// Errors out
addColors(levelSpecs.colors);

export interface Transport {
    level: string;
}

export interface Logger {
    trace(msg: LogMessage, e?: Error): void;
    debug(msg: LogMessage, e?: Error): void;
    info(msg: LogMessage, e?: Error): void;
    warn(msg: LogMessage, e?: Error): void;
    error(msg: LogMessage, e?: Error): void;
    severe(msg: LogMessage, e?: Error): void;
    transports: Transport[];
}

const LOGGERS: {[k: string]: Logger} = {};

/**
 * Create a named loggers
 * @param key the name for the logger
 * @returns the logger fo the specified key.
 */
export function create(key: string): Logger {
    return LOGGERS[key] || (LOGGERS[key] = createNew(key));
}

interface LoggerInfo {
    label: string;
    message: string;
    [k: string]: any;
}

const myFormat = format.printf((info: LoggerInfo) => {
    return `[${info.label}] ${info.level}: ${info.message}`;
});

/**
 * Create a new logger and configure
 * @param key the name for the logger
 */
function createNew(key: string): Logger {
    const logger = createLogger({
        levels: levelSpecs.levels,
        format: format.combine(
            format.colorize(),
            format.label({label: key}),
            myFormat,
        ),
        transports: [new transports.Console()],
    });
    logger.toString = () => `[Logger ${key}]`;
    logger.key = key;
    return logger;
}
