/*
 * Copyright (c) 2018 Bob Kerns.
 */

import Q from "../query";

describe("hot curried queries", () => {
    it("Simple", () => {
        const query = Q`select * from $[TABLE] where x = $tasty`;
        const curried = query.curry("hot", {TABLE: "dinner", tasty: "fish"});
        expect(curried.statement).toBe('select * from dinner where x = $tasty');
        expect(curried.parameters).toEqual({tasty: "fish"});
        expect(curried.parse.parsed.parameters).toEqual([]);
        expect(curried.name).toBe("hot");
    });

    it("Partial", () => {
        const query = Q`select * from $[TABLE] where $[DISH] = $tasty`;
        const curried = query.curry("hot",{TABLE: "dinner", tasty: "fish"});
        expect(curried.statement).toBe('select * from dinner where $[DISH] = $tasty');
        expect(curried.parameters).toEqual({tasty: "fish"});
        expect(curried.parse.parsed.parameters).toEqual(["DISH"]);
        expect(curried.name).toBe("hot");
    });

    it("name defaulted", () => {
        const query = Q`[banquet]: select * from $[TABLE] where $[DISH] = $tasty`;
        const curried = query.curry(null, {TABLE: "dinner", tasty: "fish"});
        expect(query.name).toBe("banquet");
        expect(curried.name).toMatch(/^banquet-\d+$/);
    });
});
