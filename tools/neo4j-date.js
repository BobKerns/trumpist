/*
 * Copyright (c) 2018 Bob Kerns.
 */

const {types: {DateTime}} = require('neo4j-driver').v1;

function convertDateTime(date) {
    if (date instanceof Date) {
        // All set
    } else if ((typeof date === 'string') || (typeof date === 'number')) {
        date = new Date(date);
    } else {
        throw new TypeError(`Incorrect type in convertDateTime(${date})`);
    }
    return new DateTime(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds(),
        date.getUTCMilliseconds() * 1000, // nanoseconds
        0 // TZ
    );
}

module.exports = {
    convertDateTime
};