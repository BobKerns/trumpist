/*
 * Copyright (c) 2018 Bob Kerns.
 */

import "jest";

import {convertDateTime} from "../neo4j-date";

const numericDate = 1528463144144;
const stringDateLong = "Fri Jun 08 2018 06:05:57 GMT-0700 (PDT)";
const stringDateISO = "2018-06-08T13:05:49.062Z";

it("can convert a numeric date", () => {
    const neoDate = convertDateTime(numericDate);
});

it("can convert a long string date", () => {
    const neoDate = convertDateTime(stringDateLong);
});

it("can convert an ISO string date", () => {
    const neoDate = convertDateTime(stringDateISO);
});
