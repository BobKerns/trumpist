/*
 * Copyright (c) 2018 Bob Kerns.
 */

// Logging configuration

const { createLogger, format, transports } = require('winston')

const LOGGERS = {};

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

