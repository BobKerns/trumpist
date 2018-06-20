/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {v1 as neo4j} from './neo4j-driver/index';

export function convertDateTime(date: Date | string | number): neo4j.types.DateTime<number> {
    if (date instanceof Date) {
        // All set
    } else if ((typeof date === 'string') || (typeof date === 'number')) {
        date = new Date(date);
    } else {
        throw new TypeError(`Incorrect type in convertDateTime(${date})`);
    }
    return new neo4j.types.DateTime(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds(),
        date.getUTCMilliseconds() * 1000, // nanoseconds
        0,  // TZ
    );
}
