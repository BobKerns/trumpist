/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {Duplex, Readable, Transform, Writable} from "stream";

/**
 * A utility type for when values maynot be suppiled, especiallly from Javascript
 */

export type Nullable<T> = T | undefined | null;


/**
 * A utility type for arbitrary parameters.
 */
export interface AnyParams<T=any> {
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
 * A geneal Node callback
 */
export type Callback = (val?: any, err?: Error) => void;

/**
 * Give access to additional properties no declared. Useful when working with Javascript types with ad hoc extension.
 */
export type Extensible<T,V=any> = T & AnyParams<V>;