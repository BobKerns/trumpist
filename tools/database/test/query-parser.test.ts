/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {QueryParser} from "../query-parser";
import * as R from "ramda";
import ownKeys = Reflect.ownKeys;

interface Accum {
    [key: string]: true;
}

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
            {input: "MERGE (n:$[labels:labels] {id: $[id]}) SET n += $props;",
                steps: ["MERGE (n:", ["labels", "labels"], " {id: ", ["id"], "}) SET n += $props;"]},
        ]
            .forEach(({input, steps}) => {
                it(`parsing ${input}`, () => {
                    const findParams = (acc: Accum, val: string|string[]): Accum => {
                        if (Array.isArray(val)) {
                            return {[val[0]]: true, ...acc};
                        }
                        return acc;
                    };
                    const accum: Accum = steps.reduce(findParams,  {});
                    const params = ownKeys(accum);
                    const parser = new QueryParser(input);
                    const result = parser.parsed;
                    steps.forEach((str: (string|[string]), i: number) => {
                        if (Array.isArray(str)) {
                            const step = result.steps[i];
                            if (typeof step === 'object') {
                                expect(step.param).toEqual(str[0]);
                            } else {
                                expect(step).toBeInstanceOf(Object);
                            }
                        } else {
                            expect(result.steps[i]).toBe(str);
                        }
                    });
                    expect(result.parameters.sort()).toEqual(params.sort());
                });
            });
    });

    interface ExpansionTest {
        label?: string;
        input: string;
        data?: {[key: string]: any};
        expect: {
            statement: string;
            missing?: string[];
            unused?: string[];
            parameters?: {[key: string]: any}
        };
    }

    describe("Expansion", () => {
        const tests: ExpansionTest[] = [
            {
                label: 'simple',
                input: '$[PARAM1]',
                data: {PARAM1: 'VAL1'},
                expect: {statement: '\"VAL1\"'},
            },
            {
                input: 'trivial',
                expect: {statement: 'trivial'},
            },
            {
                label: "Full substitution",
                input: "foo:$[CLASS:id]:$bar",
                data: {CLASS: "yoga"},
                expect: {statement: 'foo:`yoga`:$bar'},
            },
            {
                label: "Unsatisfied substitution",
                input: "foo:$[CLASS]:$bar",
                data: {},
                expect: {
                    statement: 'foo:$[CLASS]:$bar',
                    missing: ["CLASS"],
                },
            },
            {
                label: "Extra stuff",
                input: "foo:$[CLASS]:$bar",
                data: {extra: "stuff"},
                expect: {
                    statement: 'foo:$[CLASS]:$bar',
                    missing: ["CLASS"],
                    unused: ["extra"],
                    parameters: {
                        extra: "stuff",
                    },
                },
            },
        ];
        tests.forEach(({label, input, data, expect: result}: ExpansionTest) => {
            it(`expanding ${label || input}`, () => {
                const expected = {statement: input, parameters: {}, missing: [], unused: [], ...result};
                const query = new QueryParser(input);
                const actual = query.expand(data || {});
                expect(actual).toEqual(expected);
            });
        });
    });
    describe('name tests', () => {
        [
            {label: 'parseName', statement: "[Fred]:select winners"},
            {label: 'leading whitespace', statement: " [Fred]:select winners"},
            {label: 'more leading whitespace', statement: "    [Fred]:select winners"},
            {label: 'post-colon whitespace', statement: "[Fred]:  select winners"},
            {label: 'pre-colon whitespace', statement: "[Fred]  :select winners"},
            {label: 'pre-name whitespace', statement: "[  Fred]:select winners"},
            {label: 'post-name whitespace', statement: "[Fred  ]:select winners"},
        ].forEach(({label, statement}) => {
            it(label, () => {
                const query = new QueryParser(statement);
                expect(query.parsed.steps[0]).toBe("select winners");
                expect(query.parsed.name).toBe('Fred');
            });
        });
    });
});
