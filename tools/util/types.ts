/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {Duplex, Readable, Transform, Writable} from "stream";

/**
 * A utility type for when values may not be supplied, especially from Javascript
 */

export type Nullable<T> = T | undefined | null;


/**
 * A utility type for arbitrary parameters.
 */
export interface AnyParams<T= any> {
    [k: string]: T;
}

/**
 * A simple transform function
 */
export type XForm<F, T> = (v: F) => T;

/**
 * A string expander.
 */
export type Template = XForm<AnyParams, string>;

/**
 * For general stream handling
 */
export type Stream = (Readable | Writable | Duplex | Transform);

/**
 * A general Node callback
 */
export type Callback = (val?: any, err?: Error) => void;

export type PromiseAccept<T> = (val: T) => void;
export type PromiseReject = (err: Error) => void;
export type PromiseCB<T> = (accept: PromiseAccept<T>, reject: PromiseReject) => void;

/**
 * Give access to additional properties not declared. Useful when working with Javascript types with ad hoc extension.
 */
export type Extensible<T, V= any> = T & AnyParams<V>;

// tslint:disable-next-line ban-types
export type AnyFunction = Function;

export function classChain(cls: AnyFunction) {
    const result = [];
    while (cls && (cls !== Object) && (cls !== Function)) {
        result.push(cls);
        cls = Object.getPrototypeOf(cls);
    }
    return result;
}
