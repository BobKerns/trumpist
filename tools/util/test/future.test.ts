/*
 * Copyright (c) 2018 Bob Kerns.
 */

import "jest";
import {Future, future} from "../future";

describe("The future", () => {
    it("gets the value", () => {
        const v = future(()=> 5);
        expect(v.value).toBe(5);
    });
});
