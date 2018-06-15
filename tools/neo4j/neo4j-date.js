"use strict";
/*
 * Copyright (c) 2018 Bob Kerns.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const neo4j_driver_1 = require("../neo4j/neo4j-driver");
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
    return new neo4j_driver_1.v1.types.DateTime(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds() * 1000, // nanoseconds
    0);
}
exports.convertDateTime = convertDateTime;
//# sourceMappingURL=neo4j-date.js.map