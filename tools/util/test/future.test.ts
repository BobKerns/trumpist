/*
 * Copyright (c) 2018 Bob Kerns.
 */

import "jest";
import {attachLog, Future, future} from "../future";
import * as util from "util";
import {create} from "../logging";
const testLog = create('test');
const testLogMethod = jest
    .spyOn(testLog, 'log')
    .mockImplementation((() => testLog))
    .mockName('testLog');

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

    it('can attach a log', async () => {
        jest.clearAllMocks();
        const futureFn = jest.fn()
            .mockImplementationOnce(() => 77)
            .mockImplementation(() => {
                throw new Error("Should not be called");
            })
            .mockName('futureFn');
        const f = future(futureFn);
        // Take a break to allow for promise execution.
        await true;
        expect(futureFn)
            .not.toHaveBeenCalled();
        attachLog(f, testLog, 'test1');
        // Take a break to allow for promise execution.
        await true;
        expect(futureFn)
            .not.toHaveBeenCalled();
        expect(testLogMethod)
            .not.toHaveBeenCalled();
        expect(f.value)
            .toBe(77);
        // Take a break to allow for promise execution.
        await true;
        expect(futureFn)
            .toHaveBeenCalledTimes(1);
        expect(testLogMethod)
            .toHaveBeenCalledTimes(1);
        expect(f.value)
            .toBe(77);
        expect(futureFn)
            .toHaveBeenCalledTimes(1);
        expect(testLogMethod)
            .toHaveBeenCalledTimes(1);
    });
});
