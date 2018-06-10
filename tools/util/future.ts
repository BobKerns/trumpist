/*
 * Copyright (c) 2018 Bob Kerns.
 */

export class Future<T> {
    private readonly future: () => T;
    private present: T;
    private failure: Error;
    private done: boolean = false;
    constructor(fn: () => T) {
        this.future = fn;
    }
    public get value(): T {
        if (this.done) {
            if (this.failure) {
                throw this.failure;
            }
            return this.present;
        }
        this.done = true;
        try {
            return this.present = this.future();
        } catch (e) {
            throw this.failure = e;
        }
    }
}

export function future<T>(fn: () => T): Future<T> {
    return new Future<T>(fn);
}
