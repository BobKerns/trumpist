/*
 * Copyright (c) 2018 Bob Kerns.
 */

/**
 * This works around a missing declaration in @types/node.
 * Hand-converted to typescript.
 */

 // Ported from https://github.com/mafintosh/end-of-stream with
 // permission from the author, Mathias Buus (@mafintosh).

 'use strict';

// An approximation of the resul of what's in internal/errors.js
class ERR_STREAM_PREMATURE_CLOSE extends Error {
    constructor() {
        super("Premature Close[ERR_STREAM_PREMATURE_CLOSE]")
    }
};

import {Callback, ExtraProps, Nullable, Stream} from "./types";

function noop() {}

function isRequest(stream: ExtraProps<Stream>) {
    return stream.setHeader && typeof stream.abort === 'function';
}

function once(callback: Callback) {
    let called = false;
    return function(err: Error) {
        if (called) return;
        called = true;
        callback.call(this, err);
    };
}

export type StreamOptions = {
    [k: string]: any
}

export type CleanupFunction = () => void;

export function finished(stream:Stream, opts: Nullable<StreamOptions|Callback>, callback?: Callback): CleanupFunction {
    let call = (obj: any, ...args: any[]): void => {
        let cb: Function = callback as Function;
        return cb.call(obj, ...args);
    }
    let istream = stream as ExtraProps<Stream>;
    if (typeof opts === 'function') return finished(istream, null, opts);
    if (!opts) opts = {};

    callback = once(callback || noop);

    const ws = istream._writableState;
    const rs = istream._readableState;
    let readable = opts.readable || (opts.readable !== false && istream.readable);
    let writable = opts.writable || (opts.writable !== false && istream.writable);

    const onlegacyfinish = () => {
        if (!istream.writable) onfinish();
    };

    const onfinish = () => {
        writable = false;
        if (!readable) call(istream);
    };

    const onend = () => {
        readable = false;
        if (!writable) call(istream);
    };

    const onerror = (err: Error) => {
        call(istream, err);
    };

    const onclose = () => {
        if (readable && !(rs && rs.ended)) {
            return call(istream, new ERR_STREAM_PREMATURE_CLOSE());
        }
        if (writable && !(ws && ws.ended)) {
            return call(istream, new ERR_STREAM_PREMATURE_CLOSE());
        }
    };

    const onrequest = () => {
        istream.req.on('finish', onfinish);
    };

    if (isRequest(istream)) {
        istream.on('complete', onfinish);
        istream.on('abort', onclose);
        if (istream.req) onrequest();
        else istream.on('request', onrequest);
    } else if (writable && !ws) { // legacy streams
        istream.on('end', onlegacyfinish);
        istream.on('close', onlegacyfinish);
    }

    istream.on('end', onend);
    istream.on('finish', onfinish);
    if (opts.error !== false) istream.on('error', onerror);
    istream.on('close', onclose);

    return function() {
        istream.removeListener('complete', onfinish);
        istream.removeListener('abort', onclose);
        istream.removeListener('request', onrequest);
        if (istream.req) istream.req.removeListener('finish', onfinish);
        istream.removeListener('end', onlegacyfinish);
        istream.removeListener('close', onlegacyfinish);
        istream.removeListener('finish', onfinish);
        istream.removeListener('end', onend);
        istream.removeListener('error', onerror);
        istream.removeListener('close', onclose);
    };
}