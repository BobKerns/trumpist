/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {QueryParser} from "../query-parser";
import * as R from "ramda";
import ownKeys = Reflect.ownKeys;

type Accum = {[key: string]: true};

describe("Testing query parsing and parameter substitution", () => {
    describe('Query parsing', () => {
        [
            {input: '', steps: ['']},
            {input: "A random string with no parameters", steps: ["A random string with no parameters"]},
            {input: "begin/$[PARAM]", steps: ['begin/', ["PARAM"]]},
            {input: "$[PARAM]/end", steps: [["PARAM"], '/end']},
            {input: "$[PARAM]", steps: [["PARAM"]]},
            {input: "begin/$[PARAM]/end", steps: ['begin/', ["PARAM"], '/end']},
            {input: "begin/$[PARAM1]/mid/$[PARAM2]/end", steps: ["begin/", ["PARAM1"], "/mid/", ["PARAM2"], "/end"]},
            {input: "begin/$[PARAM1]$[PARAM2]/end", steps: ["begin/", ["PARAM1"], ["PARAM2"], "/end"]},
            {input: "$[PARAM1]/mid/$[PARAM2]", steps: [["PARAM1"], "/mid/", ["PARAM2"]]},
            {input: "$[PARAM1]/mid/$[PARAM1]", steps: [["PARAM1"], "/mid/", ["PARAM1"]]},
        ]
            .forEach(({input, steps}) => {
                it(`parsing ${input}`, () => {
                    const findParams = (accum: Accum, val: string|string[]): Accum => {
                        if (Array.isArray(val)) {
                            return {[val[0]]: true, ...accum};
                        }
                        return accum;
                    };
                    const accum: Accum = steps.reduce(findParams,  {});
                    const params = ownKeys(accum);
                    const parser = new QueryParser(input);
                    let result = parser.parsed;
                    steps.forEach((str: (string|[string]), i: number) => {
                        if (Array.isArray(str)) {
                            let step = result.steps[i];
                            if (typeof step === 'object') {
                                expect(step.param).toEqual(str[0]);
                            } else {
                                expect(step).toBeInstanceOf(Object);
                            }
                        } else {
                            expect(result.steps[i]).toBe(str);
                        }
                    });
                    //expect(result.parameters).toEqual(params);
                    expect(result.parameters.sort()).toEqual(params.sort());
                });
            });
    });

    describe("Expansion", () => {
        [
            {
                label: 'simple',
                input: '$[PARAM1]',
                data: {PARAM1: 'VAL1'},
                expect: {statement: 'VAL1'}
            },
            {
                input: 'trivial',
                expect: {statement: 'trivial'}
            }
        ].forEach(({label, input, data, expect: result}) => {
            it(`expanding ${label || input}`, () => {
                let expected = {statement: input, parameters: {}, missing: [], unused: [], ...result};
                let query = new QueryParser(input);
                let actual = query.expand(data || {});
                expect(actual).toEqual(expected);
            });
        });
    });
})
