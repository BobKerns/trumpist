/*
 * Copyright (c) 2018 Bob Kerns.
 */
System.register([], function (exports_1, context_1) {
    /**
     * This works around a missing declaration in @types/node.
     * Hand-converted to typescript.
     */
    // Ported from https://github.com/mafintosh/end-of-stream with
    // permission from the author, Mathias Buus (@mafintosh).
    'use strict';
    var ERR_STREAM_PREMATURE_CLOSE;
    var __moduleName = context_1 && context_1.id;
    function noop() { }
    function isRequest(stream) {
        return stream.setHeader && typeof stream.abort === 'function';
    }
    function once(callback) {
        let called = false;
        return function (err) {
            if (called)
                return;
            called = true;
            callback.call(this, err);
        };
    }
    function finished(stream, opts, callback) {
        let call = (obj, ...args) => {
            let cb = callback;
            return cb.call(obj, ...args);
        };
        let istream = stream;
        if (typeof opts === 'function')
            return finished(istream, null, opts);
        if (!opts)
            opts = {};
        callback = once(callback || noop);
        const ws = istream._writableState;
        const rs = istream._readableState;
        let readable = opts.readable || (opts.readable !== false && istream.readable);
        let writable = opts.writable || (opts.writable !== false && istream.writable);
        const onlegacyfinish = () => {
            if (!istream.writable)
                onfinish();
        };
        const onfinish = () => {
            writable = false;
            if (!readable)
                call(istream);
        };
        const onend = () => {
            readable = false;
            if (!writable)
                call(istream);
        };
        const onerror = (err) => {
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
            if (istream.req)
                onrequest();
            else
                istream.on('request', onrequest);
        }
        else if (writable && !ws) { // legacy streams
            istream.on('end', onlegacyfinish);
            istream.on('close', onlegacyfinish);
        }
        istream.on('end', onend);
        istream.on('finish', onfinish);
        if (opts.error !== false)
            istream.on('error', onerror);
        istream.on('close', onclose);
        return function () {
            istream.removeListener('complete', onfinish);
            istream.removeListener('abort', onclose);
            istream.removeListener('request', onrequest);
            if (istream.req)
                istream.req.removeListener('finish', onfinish);
            istream.removeListener('end', onlegacyfinish);
            istream.removeListener('close', onlegacyfinish);
            istream.removeListener('finish', onfinish);
            istream.removeListener('end', onend);
            istream.removeListener('error', onerror);
            istream.removeListener('close', onclose);
        };
    }
    exports_1("finished", finished);
    return {
        setters: [],
        execute: function () {
            // An approximation of the resul of what's in internal/errors.js
            ERR_STREAM_PREMATURE_CLOSE = class ERR_STREAM_PREMATURE_CLOSE extends Error {
                constructor() {
                    super("Premature Close[ERR_STREAM_PREMATURE_CLOSE]");
                }
            };
            ;
        }
    };
});
//# sourceMappingURL=finished.js.map