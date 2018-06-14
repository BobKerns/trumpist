"use strict";
/*
 * Copyright (c) 2018 Bob Kerns.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const neo4j_date_1 = require("../neo4j-date");
const numericDate = 1528463144144;
const stringDateLong = "Fri Jun 08 2018 06:05:57 GMT-0700 (PDT)";
const stringDateISO = "2018-06-08T13:05:49.062Z";
it("can convert a numeric date", () => {
    const neoDate = neo4j_date_1.convertDateTime(numericDate);
});
it("can convert a long string date", () => {
    const neoDate = neo4j_date_1.convertDateTime(stringDateLong);
});
it("can convert an ISO string date", () => {
    const neoDate = neo4j_date_1.convertDateTime(stringDateISO);
});
//# sourceMappingURL=neo4j-date.test.js.map