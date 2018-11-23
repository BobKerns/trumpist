/*
 * Copyright (c) 2018 Bob Kerns.
 */


import fn = jest.fn;

const fetch = jest.fn((url: string, init?: RequestInit) => ({json: reqJson}));
const reqJson = fn();
(global as any).fetch = fetch;

import {fetchInit, fetchJSONAsync} from "../sagas";
import {Action, actions} from "../../store";

const {ui, graph} = actions;

describe("Test server comm actions", () => {
    reqJson.mockReturnValue({payload: {urk: "gug"}});
    it("Test fetcher", async () => {
        const fut = await fetchJSONAsync("test://url", {
            testStr: "string",
            testNum: 16,
            testObj: {v1: 1},
            testAry: [3, "bar"],
            testStrNum: "32",
            testStrAry: "[bar]",
            testStrObj: "{baz:buz}",
            testSpaceString: "has spaces",
        });
        const opts = [
            'testStr=string', 'testNum=16', 'testObj={"v1":1}', 'testAry=[3,\"bar\"]',
            'testStrNum="32"', 'testStrAry="[bar]"', 'testStrObj="{baz:buz}"',
            'testSpaceString=has spaces',
        ].join('&');
        expect(fetch.mock.calls.map(c => c.map(decodeURIComponent)))
            .toEqual([[`test://url?${opts}`]]);
        expect(fut).toEqual({urk: "gug"});
    });

    const sagaOps: {[key: string]: (action: Action) => any} = {
        takeEvery: fn((actionType: string, op: (a: Action) => any) => {
            return (action: Action) => {
                return op(action);
            };
        }),
    };

    function sagaInvoke(sagaValue: any, invokeArgs: any[]) {
        const sagaName = sagaValue.payload.fn.name;
        const {args, context} = sagaValue.payload;
        return sagaOps[sagaName].apply(context, args)(...invokeArgs);
    }

    interface SagaStep {
        op?: keyof typeof sagaOps;
        fn?: (v: any) => void;
        expect?: any;
        args?: any[];
    }

    async function sagaRun(gen: any, ...check: Array<SagaStep|'DONE'|'CONTINUE'>) {
        expect(gen.constructor.constructor.name).toBe("GeneratorFunction");
        return sagaRunInternal(gen, check[Symbol.iterator]());
    }

    async function sagaRunInternal(gen: any, check: IterableIterator<SagaStep|'DONE'|'CONTINUE'>, contFlag: boolean = false) {
        let done: boolean = false;
        let value: any = undefined;
        let continueFlag: boolean = contFlag;
        let c: SagaStep | 'DONE' | 'CONTINUE';
        const next = async () => {
            if (done) {
                throw new Error("Saga I/O op ended early");
            }
            if (continueFlag) {
                throw new Error("Malformed Saga checks; 'CONTINUE' must be last if present.");
            }
            let r =  gen.next(value);
            done = r.done;
            value = r.value;
            while (value && value[Symbol.iterator] && value.next) {
                value = await sagaRunInternal(value, check, true);
                r =  gen.next(value);
                done = r.done;
                value = r.value;
            }
            const cr  = check.next();
            c = cr.value;
            return !cr.done && !done;
        };
        while (await next()) {
            if (c === 'DONE') {
                expect(done).toBe(true);
            } else if (c === 'CONTINUE') {
                continueFlag = true;
            } else {
                if (c.hasOwnProperty('expect')) {
                    expect(value ? value.payload : undefined).toEqual(c.expect);
                }
                if (c.fn) {
                    c.fn(value.payload);
                }
                if (c.op) {
                    expect(value.payload.fn.name).toBe(c.op);
                }
                value = await sagaInvoke(value, (c.args || []));
            }
        }
        if (!done && !continueFlag) {
            throw new Error("Saga I/O op is not complete.");
        }
        return value;
    }

    it("Test FetchInit", async () => {
        const gen = fetchInit();
        expect(await sagaRun(gen,
            {op: "takeEvery", args: [ui.init()]},
            {},
            {expect: {type: "ui/init"}},
            ));
    });
});
