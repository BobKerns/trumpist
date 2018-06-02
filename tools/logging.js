/*
 * Copyright (c) 2018 Bob Kerns.
 */

// Logging configuration

/**
 * Our logging, configured.
 * @module logging
 */
const { createLogger, format, transports } = require('winston');

const LOGGERS = {};

/**
 * Create a named logger
 * @param key the name for the logger
 * @returns {module:logging.Logger}
 * @static
 * @memberOf module:logging.Logger
 */
function create(key) {
    return LOGGERS[key] || (LOGGERS[key] = createNew(key));
}

const myFormat = format.printf(info => {
    return `[${info.label}] ${info.level}: ${info.message}`;
});

/**
 * Create a new logger and configure
 * @param key the name for the logger
 * @returns {module:logging.Logger}
 * @static
 * @memberOf module:logging.Logger
 */
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
 * @memberOf module:logging
 */

/**
 * @method
 * @name module:logging.Logger#info
 * @param {string} message
 */

/**
* @method
* @name module:logging.Logger#debug
* @param {string} message
*/

/**
 * @method
 * @name module:logging.Logger#trace
 * @param {string} message
 */

/**
 * @method
 * @name module:logging.Logger#error
 * @param {string} message
 */

/**
 * @method
 * @name module:logging.Logger#warn
 * @param {string} message
 */

/**
 * @method
 * @name module:logging.Logger#severe
 * @param {string} message
 */

