/*
 * Copyright (c) 2018 Bob Kerns.
 */
/**
 * Various utilily streams.
 */
System.register(["util", "stream", "./finished"], function (exports_1, context_1) {
    "use strict";
    var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    var util_1, stream_1, finished_1, pipeline, finished, Bomstrip;
    var __moduleName = context_1 && context_1.id;
    /**
     * Likely should be repalcd with [[finished]]
     * @param stream Readable, Writable, or both
     * @returns {Promise<any>}
     */
    function done(stream) {
        return new Promise((resolve, reject) => {
            stream.on('close', () => resolve(stream));
            stream.on('finish', () => resolve(stream));
            stream.on('error', (e) => reject(e));
        });
    }
    exports_1("done", done);
    function logstream(log, key, template) {
        return function (data) {
            try {
                log.info(`${key}: ${template(data)}`);
            }
            catch (e) {
                log.error(`${key}: ${e.message || e}`);
            }
        };
    }
    exports_1("logstream", logstream);
    /**
     * Produce a filter stream
     * @param f
     */
    function filter(f) {
        let stream;
        function transform(obj, encoding, cb) {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    let p = f && f(obj);
                    p = yield p;
                    if (p) {
                        stream.push(obj);
                    }
                    cb();
                }
                catch (e) {
                    cb(null, e);
                }
            });
        }
        stream = new stream_1.Transform({ objectMode: true, transform: transform });
        return stream;
    }
    exports_1("filter", filter);
    /**
     * Produce an output stream to serve as destination.
     * @param f Called on each value output
     */
    function sink(f) {
        let s = filter(v => ++s.count && f && f(v) && false);
        s.count = 0;
        return s;
    }
    exports_1("sink", sink);
    /**
     * Produce a stream that processes output
     * @param f Called on each value; substituting the return value.
     */
    function thru(f) {
        return filter(v => (f && f(v)) || true);
    }
    exports_1("thru", thru);
    function split(input, ...outputs) {
        return Promise.all(outputs.map(o => pipeline(input, o)));
    }
    exports_1("split", split);
    return {
        setters: [
            function (util_1_1) {
                util_1 = util_1_1;
            },
            function (stream_1_1) {
                stream_1 = stream_1_1;
            },
            function (finished_1_1) {
                finished_1 = finished_1_1;
            }
        ],
        execute: function () {
            exports_1("pipeline", pipeline = util_1.promisify(stream_1.pipeline));
            exports_1("finished", finished = util_1.promisify(finished_1.finished));
            exports_1("Bomstrip", Bomstrip = require('bomstrip'));
        }
    };
});
//# sourceMappingURL=streams.js.map