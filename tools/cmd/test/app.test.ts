/*
 * Copyright (c) 2018 Bob Kerns.
 */

import "jest";

import * as app from "../app";
import {App} from "../app";

describe("Test app facilities.", () => {
    it('Test option merging of top-level global options', () => {
        const result =  App.mergeContextOptions("appSettings", ["A", "B", "C"],
            {a: 1, d: 1},
            {a: 2, c: 1},
            {c: 2, b: 1});
        expect(result).toEqual({a: 2, b: 1, c: 2, d: 1});
    });

    it('Test option merging of context options (forward)', () => {
        const result =  App.mergeContextOptions("appSettings", ["A", "B", "C"],
            {
                appSettings: {
                    A: {a: 1, d: 1},
                    B: {a: 2, b: 2, c: 2},
                    C: {c: 3, b: 3, e: 3},
                },
            });
        expect(result).toEqual({a: 2, b: 3, c: 3, d: 1, e: 3});
    });


    it('Test option merging of context options (reverse)', () => {
        const result =  App.mergeContextOptions("appSettings", ["A", "B", "C"].reverse(),
            {
                appSettings: {
                    A: {a: 1, d: 1},
                    B: {a: 2, b: 2, c: 2},
                    C: {c: 3, b: 3, e: 3},
                },
            });
        expect(result).toEqual({a: 1, b: 2, c: 2, d: 1, e: 3});
    });

    it('Test merging of context options between sets (reverse)', () => {
        const result =  App.mergeContextOptions("appSettings", ["A", "B", "C"].reverse(),
            {
                appSettings: {
                    A: {a: 1, d: 1},
                    B: {a: 2, b: 2, c: 2},
                },
            },
            {
                appSettings: {
                    C: {c: 3, b: 3, e: 3},
                },
            });
        // The later set of settings takes precedence, regardless of the key order.
        expect(result).toEqual({a: 1, b: 3, c: 3, d: 1, e: 3});
    });

    it('Test merging of with overrides', () => {
        const result =  App.mergeContextOptions("appSettings", ["A", "B", "C"],
            {
                a: 77,
                cow: 'fish',
                horse: "roan",
                appSettings: {
                    A: {a: 1, d: 1},
                    B: {a: 2, b: 2, c: 2},
                },
            },
            {
                a: 99,
                pig: "pickle",
                horse: "pink",
                appSettings: {
                    C: {c: 3, b: 3, e: 3},
                },
            });
        // The later set of settings takes precedence, regardless of the key order.
        expect(result).toEqual({a: 99, b: 3, c: 3, d: 1, e: 3, cow: "fish", pig: "pickle", horse: "pink"});
    });
});
