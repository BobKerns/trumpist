/*
 * Copyright (c) 2018 Bob Kerns.
 */

import Q from "../../database/query";

describe('Tests of backtick-parsed queries', () => {
    it('Simple', () => {
        const query = Q`backtick functionality: 3 + 4 = ${3 + 4}`;
        const expected = "backtick functionality: 3 + 4 = 7";
        expect(query.parse.statement).toBe(expected);
        expect(query.parse.parsed.steps[0]).toBe(expected);
    });
});
