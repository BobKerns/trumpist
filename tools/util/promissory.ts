/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {PromiseAccept, PromiseCB, PromiseReject} from "./types";

/**
 * A Promise with explicit resume/error callbacks.
 */
export class Promissory<T> extends Promise<T> {
    /**
     * Call this once to set the value of the `Promissory`.
     */
    public accept: PromiseAccept<T>;
    /**
     * Call this instead of [Promissory.accept] to indicate an error has occurred
     */
    public reject: PromiseReject;

    /**
     * Construct a Promissory—a promise that is explicitly accepted or rejected from outside.
     *
     * @param {PromiseCB<T>} cb Required for ECMAscript compatibility, but normally omitted.
     */
    constructor(cb?: PromiseCB<T>) {
        let accept: PromiseAccept<T>| null = null;
        let reject: PromiseReject | null = null;
        super((ac: PromiseAccept<T>, rj: PromiseReject) => {
            if (cb) {
                cb(ac, rj);
            }
            accept = ac;
            reject = rj;
        });
        if (accept) {
            this.accept = this.accept || accept;
        }
        if (reject) {
            this.reject = this.reject || reject;
        }

    }
}
