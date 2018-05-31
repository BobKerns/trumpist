/*
 * Copyright (c) 2018 Bob Kerns.
 */

// Logging configuration

const { createLogger, format, transports } = require('winston');

const LOGGERS = {};

/**
 * Create a named logger
 * @param key the name for the logger
 * @returns {Logger}
 */
function create(key) {
    return LOGGERS[key] || (LOGGERS[key] = createNew(key));
}

const myFormat = format.printf(info => {
    return `[${info.label}] ${info.level}: ${info.message}`;
});

function createNew(key) {
    return createLogger({
        format: format.combine(
            format.colorize(),
            format.label({label: key}),
            myFormat
        ),
        transports: [new transports.Console()]
    });
}

module.exports = create;

/**
 * @interface
 * @name Logger
 */

/**
 * @method
 * @name Logger#info
 * @param {string} message
 */

/**
* @method
* @name Logger#debug
* @param {string} message
*/

/**
 * @method
 * @name Logger#trace
 * @param {string} message
 */

/**
 * @method
 * @name Logger#error
 * @param {string} message
 */

/**
 * @method
 * @name Logger#warn
 * @param {string} message
 */

/**
 * @method
 * @name Logger#severe
 * @param {string} message
 */

