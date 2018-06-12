/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {QueryParser} from "../query-parser";
import * as R from "ramda";


describe("Testing query parsing and parameter substitution", () => {
    [
        {input: "A random string with no parameters", steps: ["A random string with no parameters"]},
        {input: "begin/$[PARAM]", steps: ['begin/', ["PARAM"]]},
        {input: "$[PARAM]/end", steps: [["PARAM"], '/end']},
        {input: "$[PARAM]", steps: [["PARAM"]]},
        {input: "begin/$[PARAM]/end", steps: ['begin/', ["PARAM"], '/end']},
        {input: "begin/$[PARAM1]/mid/$[PARAM2]/end", steps: ["begin/", ["PARAM1"], "/mid/", ["PARAM2"], "/end"]},
        {input: "begin/$[PARAM1]$[PARAM2]/end", steps: ["begin/", ["PARAM1"], ["PARAM2"], "/end"]},
        {input: "$[PARAM1]/mid/$[PARAM2]", steps: [["PARAM1"], ["PARAM2"]]},
    ]
        .forEach(({input, steps}) => {
            it(`testing ${input}`, () => {
                const findParams = (accum: string[], val: string|string[]): [(string|null)[], (string|null)] => {
                    if (Array.isArray( val)) {
                        return [[...accum, val[0]], null];
                    }
                    return [accum, val];
                };
                const [params, nsteps]: [(string|null)[], (string|null)[]] = R.mapAccum(findParams, [], steps);
                const parser = new QueryParser(input);
                let result = parser.parsed;
                nsteps.forEach((str: (string|null), i: number) => {
                    if (str !== null) {
                        expect(result.steps[i]).toEqual(nsteps[i]);
                    }
                });
                expect(result.parameters).toEqual(params);
            });
        });
    it("should parse one parameter query", () => {
        const oneParameter = "begin/$[PARAM]/end";
        const parser = new QueryParser(oneParameter);
        const result = parser.parsed;
        [0, 2].forEach(i => {
            expect(result.steps[i]).toEqual(['begin/', null, '/end'][i]);
        });
        expect(result.parameters).toEqual(['PARAM']);
    });

    it("should parse multiple parameter query", () => {
        const oneParameter = "begin/$[PARAM1]/mid/$[PARAM2]/end";
        const parser = new QueryParser(oneParameter);
        let result = parser.parsed;
        [0, 2].forEach(i => {
            expect(result.steps[i]).toEqual(['begin/', null, '/mid/', null, '/end'][i]);
        });
        expect(result.parameters).toEqual(['PARAM1', 'PARAM2']);
    });
})
