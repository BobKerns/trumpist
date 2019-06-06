/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {AnyFunction, Callback, PromiseAccept, PromiseFinally, PromiseReject} from "./types";
import {Logger, Level} from "./logging";
import {inspect, types} from "util";
import isPromise = types.isPromise;

interface Attachable<T> {
    attachLog(log: Logger, id: string, sucessLevel?: Level, failLevel?: Level): this;
}
/**
 * A `PromiseOnDemand` is any of a family of `PromiseLike` classes that only begins calculation on demand.
 */
export abstract class PromiseOnDemand<T> implements PromiseLike<T>, Attachable<T> {
    protected _value: T;
    protected failure: Error;
    protected done: boolean = false;
    private _promise: Promise<T>;
    // Convert this to a resolved promise.
    public get promise(): Promise<T> {
        if (this._promise) {
            return this._promise;
        }
        if (this.done) {
            return this._promise = this.failure ? Promise.reject(this.failure) : Promise.resolve(this._value);
        }
        return this._promise = this.newPromise();
    }

    protected abstract newPromise(): Promise<T>;

    public then<TResult1 = T, TResult2 = never>(
        onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null):
        Promise<TResult1 | TResult2> {
        // Get a real Promise and pass it to that.
        return this.promise.then<TResult1, TResult2>(onfulfilled, onrejected);
    }

    public catch(reject: PromiseReject<never>): Promise<T> {
        return this.promise.catch(reject);
    }

    public finally(fn: PromiseFinally): Promise<T> {
        return this.promise.finally(fn);
    }

    public attachLog(log: Logger, id: string, sucessLevel= Level.trace, failLevel = Level.error): this {
        const okFn = (v: T) => {
            log.log(sucessLevel, () => `Promise ${id} succeeded with: ${inspect(v)}`);
            return v;
        };
        const failFn = (e: Error) => {
            log.log(failLevel, () => `Promise ${id} failed with: ${e.message}`, e);
            throw e;
        };
        this
            .then(okFn, failFn);
        return this;
    }
}

/**
 * Perform some calculation in the future when it is actually needed. The `value` property will obtain it, or
 * it can be treated as a Promise that completes when first observed.
 */
export class Future<T> extends PromiseOnDemand<T> {
    private readonly future: () => T;
    private logWait: ManualPromise<T>;
    constructor(fn: () => T) {
        super();
        this.future = fn;
    }

    /**
     * Perform the calculation and construct a promise with the result.
     * @returns {Promise<T>}
     */
    protected newPromise(): Promise<T> {
        return new Promise<T>((accept, reject) => {
            try {
                accept(this.value);
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * Get the value of the calculation. If it has not been calculated prior, it is calculated now.
     * @returns {T}
     */
    public get value(): T {
        if (this.done) {
            if (this.failure) {
                throw this.failure;
            }
            return this._value;
        }
        this.done = true;
        try {
            const v = this._value = this.future();
            if (this.logWait) {
                this.logWait.resolve(v);
            }
            return v;
        } catch (e) {
            if (this.logWait) {
                this.logWait.reject(e);
            }
            throw this.failure = e;
        }
    }

    /**
     * For {@link Future} and derived classes, we don't want attaching a logger to trigger evaluation.
     * @param {Logger} log
     * @param {string} id
     * @param {Level} successLevel
     * @param {Level} failLevel
     * @returns {this}
     */
    public attachLog(log: Logger, id: string, successLevel= Level.trace, failLevel = Level.error): this {
        const okFn = (v: T) => {
            log.log(successLevel, () => `Promise ${id} succeeded with: ${inspect(v)}`);
            return v;
        };
        const failFn = (e: Error) => {
            log.log(failLevel, () => `Promise ${id} failed with: ${e.message}`, e);
            throw e;
        };
        if (this.done) {
            if (this.failure) {
                failFn(this.failure);
            } else {
                okFn(this._value);
            }
        } else {
            this.logWait = new ManualPromise<T>();
            this.logWait.then( okFn, failFn);
        }
        return this;
    }
}

/**
 * A `Deferred` is a `Promise` whose calculation won't start until someone requests it by waiting on it as a `Promise`.
 */
export type Deferred<T> = Future<Promise<T>>;

export abstract class AbstractTriggeredPromise<T> extends PromiseOnDemand<T> {
    protected _reject: PromiseReject<void> = () => {throw new Error("Never"); };
    protected _accept: PromiseAccept<T, void> = () => undefined;

    /**
     * Construct a Promise that will be satisfied in the future by the invocation of the `wrapped` function.
     * @returns {Promise<ReturnType<F>>}
     */
    protected newPromise(): Promise<T> {
        return new Promise<T>((accept, reject) => {
            // Replace our placeholders
            this._accept = accept;
            this._reject = reject;
        });
    }
}

/**
 * A `Triggered` is a `Future`-like `Promise` whose supplied deferred calculation won't happen until explicitly triggered.
 */

export class Triggered<T> extends AbstractTriggeredPromise<T> {
    private future: Deferred<T>;
    constructor(fn: () => T) {
        super();
        this.future = deferred(fn);
    }

    /**
     * Trigger the execution of the supplied deferred function.
     * @returns {Promise<T>}
     */
    public trigger(): Promise<T> {
        if (this.done) {
            return this.promise;
        }
        this.done = true;
        try {
            this._accept(this.future.value);
        } catch (e) {
            this._reject(e);
        }
        return this.promise;
    }
}

/**
 * Convert a function into a triggered promise..
 * @param {() => T} fn
 * @returns {Triggered<T>}
 */
function triggered<T>(fn: () => T): Triggered<T> {
    return new Triggered(fn);
}

/**
 * A promise which is externally resolved (or rejected), indicating some external event or state transition
 * has occurred, or data has become available (or a failure has occurred).
 */
export class ManualPromise<T> extends AbstractTriggeredPromise<T> {
    constructor() {
        super();
    }

    /**
     * Call this to set the promise to successfully resolved.
     * @param {T} val
     * @returns {Promise<T>}
     */
    public resolve(val: T) {
        if (this.done) {
            return this.promise;
        }
        this.done = true;
        const p = this.promise; // Also causes it and its callbacks to exist.
        this._accept(val);
        return p;
    }

    /**
     * Call this to set the promise to failed.
     * @param val
     * @returns {Promise<T>}
     */
    public reject(val: any) {
        if (this.done) {
            return this.promise;
        }
        const p = this.promise; // Also causes it and its callbacks to exist.
        this._reject(val);
        return p;
    }

    /**
     * Obtain a callback that can be supplied to Node-style error-first callbacks, to resolve or fail this promise
     * on the result of that call.
     * @returns {Callback<T>}
     * @constructor
     */
    public get Callback(): Callback<T> {
        return (err: any, arg?: T) => {
            if (err) {
                this.reject(err);
            } else {
                this.resolve(arg as T);
            }
        };
    }
}


/**
 * Don't calculate `fn` until it's needed, and only calculate it once.
 * The Future can be treated as a Promise.
 * @param {() => T} fn
 * @returns {Future<T>}
 */
export function future<T>(fn: () => T): Future<T> {
    return new Future<T>(fn);
}

/**
 * Don't start calculating `fn` until it's needed, and only calculate it once.
 * Returns a Promise of the result.
 * @param {() => Promise<T>} fn
 * @returns {Deferred<T>}
 */
export function deferred<T>(fn: () => T | Promise<T>): Deferred<T> {
    return future(() => Promise.resolve(fn()));
}

/**
 * Given a function of no arguments that does something, return a new function that only does the calculation once,
 * and thereafter returns the original result. If the original throws an error, subsequent ones will as well.
 * @param {() => T} fn
 * @returns {() => T}
 */
export function once<T>(fn: () => T): () => T {
    const f = future(fn);
    return () => f.value;
}

/**
 * A pair of functions. The value from wrapped function is made available by calling the `value()` function.
 * This may also be treated as a `Promise` of the value of the `wrapped` function, resolved and available once
 * it has been invoked.
 */
export class Capture<F extends AnyFunction, V extends ReturnType<F>> extends AbstractTriggeredPromise<V> {
    private readonly f: F;

    /**
     * The value that was calculated by the `wrapped` function.
     * @returns {ReturnType<F extends AnyFunction>}
     */
    public readonly value: () => ReturnType<F> = () => {
        if (!this.done) {
            throw new Error("Value requested before it has been computed.");
        }
        if (this.failure) {
            throw this.failure;
        }
        return this._value;
    }

    /**
     * The function whose value is captured.
     */
    public readonly wrapped: F;

    /**
     * Wrap the provided function to capture the result for the future use of the `value` function and for any
     * pending `Promise`.
     * @param {F} f
     * @returns {F}
     */
    private wrap(f: F): F {
        const nf = (...args: any[]) => {
            if (this.done) {
                throw new Error("Wrapped function called more than once.");
            }
            this.done = true;
            try {
                const v = this._value = this.f(...args);
                this._accept(v);
                return v;
            } catch (e) {
                this.failure = e;
                this._reject(e);
                throw e;
            }
        };
        return nf as F;
    }

    constructor(f: F) {
        super();
        this.f = f;
        this.wrapped = this.wrap(f);
    }
}

export function captureValue<F extends AnyFunction, V extends ReturnType<F>>(f: F) {
    return new Capture(f);
}

/**
 * Type guard for things that will be treated as promises (aka "thenables").
 * @param promise
 * @returns {promise is PromiseLike<T>}
 */
export function isPromiseLike<T>(promise: any):
    promise is PromiseLike<T> {
    return !!(promise as any).then;
}

/**
 * Type guard for {@link Future} instances.
 * @param promise
 * @returns {promise is Future<T>}
 */
export function isFuture<T>(promise: any):
    promise is Future<T> {

    isPromise(promise);
    return !!(promise instanceof Future);
}

/**
 * Type guard for {@link PromiseOnDemand} instances, i.e. any of the promise-like objects in this module.
 * @param promise
 * @returns {promise is Attachable<T>}
 */
export function isPromiseOnDemand<T>(promise: any):
    promise is PromiseOnDemand<T> {
    return isPromiseLike(promise) && (promise instanceof PromiseOnDemand);
}

/**
 * Attach a log to report on the resolution of a promise.
 * @param promise
 * @returns {promise is Attachable<T>}
 */
export function canAttachLog<T>(promise: any):
    promise is Attachable<T> {
    return !!promise.attachLog;
}

/**
 * Attach a log to a promise or promise-like object.
 * @param {P & PromiseLike<T>} promise
 * @param {Logger} log
 * @param {string} id
 * @param {Level} successLevel
 * @param {Level} failLevel
 * @returns {P}
 */
export function attachLog<T, P extends PromiseLike<T> | Attachable<T>>(
    promise: P & PromiseLike<T>,  log: Logger, id: string, successLevel= Level.trace, failLevel = Level.error):
    P {
    if (canAttachLog(promise)) {
        promise.attachLog(log, id, successLevel, failLevel);
    } else {
        const okFn = (v: T) => {
            log.log(successLevel, () => `Promise ${id} succeeded with: ${inspect(v)}`);
            return v;
        };
        const failFn = (e: Error) => {
            log.log(failLevel, () => `Promise ${id} failed with: ${e.message}`, e);
            throw e;
        };
        promise.then(okFn, failFn);
    }
    return promise;
}
