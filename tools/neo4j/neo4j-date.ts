/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as neo4j from './neo4j';

export function convertDateTime(date: Date | string | number): neo4j.DateTime<number> {
    if (date instanceof Date) {
        // All set
    } else if ((typeof date === 'string') || (typeof date === 'number')) {
        date = new Date(date);
    } else {
        throw new TypeError(`Incorrect type in convertDateTime(${date})`);
    }

    const d = new neo4j.Date(2018, 10, 30);

    return new neo4j.DateTime(
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
