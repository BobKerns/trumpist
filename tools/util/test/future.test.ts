/*
 * Copyright (c) 2018 Bob Kerns.
 */

import "jest";
import {Future, future} from "../future";

describe("The future", () => {
    it("gets the value", () => {
        const v = future(() => 5);
        expect(v.value).toBe(5);
    });

    it("gets the same value each time", () => {
        let count: number = 0;
        const v = future(() => count++);
        expect(v.value).toBe(v.value);
        expect(count).toBe(1);
    });
});
