/*
 * Copyright (c) 2018 Bob Kerns.
 */

import Q from "../query";

describe("hot curried queries", () => {
    it("Simple", () => {
        const query = Q`select * from $[TABLE:id] where x = $tasty`;
        const curried = query.curry("hot", {TABLE: "dinner", tasty: "fish"});
        expect(curried.statement).toBe('select * from `dinner` where x = $tasty');
        expect(curried.parameters).toEqual({tasty: "fish"});
        expect(curried.parse.parsed.parameters).toEqual([]);
        expect(curried.name).toBe("hot");
    });

    it("Partial", () => {
        const query = Q`select * from $[TABLE:id] where $[DISH] = $tasty`;
        const curried = query.curry("hot",{TABLE: "dinner", tasty: "fish"});
        expect(curried.statement).toBe('select * from `dinner` where $[DISH] = $tasty');
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

    it("labels", () => {
        const query = Q`MERGE (n:$[labels:labels] {id: $id}) SET n += $props;`
        const curried = query.curry(null, {labels: ["a", "b"]});
        expect(curried.parameters).toEqual({});
        expect(curried.parse.parsed.parameters).toEqual([]);
        expect(curried.statement).toBe("MERGE (n:a:b {id: $id}) SET n += $props;");
    });
});
