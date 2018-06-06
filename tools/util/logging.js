/*
 * Copyright (c) 2018 Bob Kerns.
 */
System.register([], function (exports_1, context_1) {
    "use strict";
    var _a, createLogger, format, transports, LOGGERS, myFormat;
    var __moduleName = context_1 && context_1.id;
    /**
     * Create a named loggers
     * @param key the name for the logger
     * @returns the logger fo the specified key.
     */
    function create(key) {
        return LOGGERS[key] || (LOGGERS[key] = createNew(key));
    }
    exports_1("create", create);
    /**
     * Create a new logger and configure
     * @param key the name for the logger
     */
    function createNew(key) {
        return createLogger({
            format: format.combine(format.colorize(), format.label({ label: key }), myFormat),
            transports: [new transports.Console()]
        });
    }
    return {
        setters: [],
        execute: function () {
            /**
             * Our logging, configured.
             */
            _a = require('winston'), createLogger = _a.createLogger, format = _a.format, transports = _a.transports;
            LOGGERS = {};
            myFormat = format.printf((info) => {
                return `[${info.label}] ${info.level}: ${info.message}`;
            });
        }
    };
});
//# sourceMappingURL=logging.js.map