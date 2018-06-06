/*
 * Copyright (c) 2018 Bob Kerns.
 */
System.register([], function (exports_1, context_1) {
    "use strict";
    var DateTime;
    var __moduleName = context_1 && context_1.id;
    function convertDateTime(date) {
        if (date instanceof Date) {
            // All set
        }
        else if ((typeof date === 'string') || (typeof date === 'number')) {
            date = new Date(date);
        }
        else {
            throw new TypeError(`Incorrect type in convertDateTime(${date})`);
        }
        return new DateTime(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds() * 1000, // nanoseconds
        0 // TZ
        );
    }
    exports_1("convertDateTime", convertDateTime);
    return {
        setters: [],
        execute: function () {
            /**
             * @module dbaccess
             */
            DateTime = require('neo4j-driver').v1.types.DateTime;
        }
    };
});
//# sourceMappingURL=neo4j-date.js.map