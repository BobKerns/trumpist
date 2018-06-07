/*
 * Copyright (c) 2018 Bob Kerns.
 */
/**
 * Various utilily streams.
 */

"use strict";
import {promisify} from "util";
import {Duplex, pipeline as s_pipeline, Readable, Transform, Writable} from "stream";

import {finished as s_finished} from "./finished";
import {Logger} from "./logging";

import {Nullable, XForm, Template, AnyParams, Callback, Extensible} from "./types";


export const pipeline = promisify(s_pipeline);
export const finished = promisify(s_finished);

export interface Bomstrip extends Duplex{

}
export const Bomstrip = require('bomstrip') as new () => Bomstrip;

/**
 * Likely should be repalcd with [[finished]]
 * @param stream Readable, Writable, or both
 */
export function done(stream: Readable|Writable): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        stream.on('finish', () => resolve());
        stream.on('error', (e) => reject(e));
    });
}

export function logstream(log: Logger, key: string, template: Template) {
    return function (data: AnyParams) {
        try {
            log.info(`${key}: ${template(data)}`);
        } catch (e) {
            log.error(`${key}: ${e.message || e}`);
        }
    };
}

/**
 * Produce a filter stream
 * @param f
 */
export function filter(f: XForm<any,any>) : Duplex {
    let stream: Duplex;
    async function transform(obj: any, encoding: Nullable<string>, cb: Callback) {
        try {
            let p = f && f(obj);
            p = await p;
            if (p) {
                stream.push(obj);
            }
            cb();
        } catch (e) {
            cb(null, e);
        }
    }
    stream = new Transform({objectMode: true, transform: transform});
    return stream;
}


/**
 * Produce an output stream to serve as destination.
 * @param f Called on each value output
 */
export function sink<T>(f: XForm<T, void>) : Writable {
    let s: Extensible<Duplex> = filter(v => ++s.count && f && f(v) && false) as Extensible<Duplex>;
    s.count = 0;
    return s;
}

/**
 * Produce a stream that processes output
 * @param f Called on each value; substituting the return value.
 */
export function thru<F, T>(f: XForm<F, T>): Duplex {
    return filter(v => (f && f(v)) || true);
}

export function split(input: Readable, ...outputs: Writable[]) {
    return Promise.all(outputs.map(o => pipeline(input, o)));
}

