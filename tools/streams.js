/*
 * Copyright (c) 2018 Bob Kerns.
 */

"use strict";
const util = require('util');
const { Transform, pipeline: s_pipeline, finished: s_finished } = require('stream');
const pipeline = util.promisify(s_pipeline);
const finished = util.promisify(s_finished);

function done(stream) {
    return new Promise((resolve, reject) => {
        //stream.on('close', () => resolve(stream));
        stream.on('finish', () => resolve(stream));
        stream.on('error', (e) => reject(e));
    });
}


function logstream(log, key, template) {
    return function (data) {
        try {
            log.info(`${key}: ${template(data)}`);
        } catch (e) {
            log.error(`${key}: ${e.message || e}`);
        }
    };
}

/**
 * Produce a filter stream
 * @param {filterCallback} f
 * @returns {Duplex}
 */
function filter(f) {
    let stream;
    async function transform(obj, encoding, cb) {
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
    // noinspection JSUnusedGlobalSymbols
    stream = new Transform({objectMode: true, transform: transform});
    return stream;
}

/**
 * @callback filterCallback
 * @param f
 * @returns {boolean}
 */

/**
 * Produce an output stream to serve as destination.
 * @param {sinkCallback} f
 * @returns {Writable}
 */
function sink(f) {
    let s = filter(v => ++s.count && f && f(v) && false);
    s.count = 0;
    return s;
}
/**
 * @callback sinkCallback
 * @param data
 * @returns {void}
 */

/**
 * @callback thruCallback
 * @param data
 * @return {*}
 */

/**
 * Produce a stream that processes output
 * @param {thruCallback} f
 * @returns {Duplex}
 */
function thru(f) {
    return filter(v => (f && f(v)) || true);
}

function split(input, ...outputs) {
    return Promise.all(outputs.map(o => pipeline(input, o)));
}

module.exports = {
    pipeline,
    logstream: logstream,
    sink,
    filter,
    thru,
    split,
    finished,
    done
};

/**
 * @name EventEmitter
 * @interface
 */

/**
 * @name on
 * @param {string} event
 * @param {function} handler
 */

/**
 * @name Writable
 * @interface
 * @implements EventEmitter
 */

/**
 * @name Readable
 * @interface
 * @implements EventEmitter
 */

/**
 * @name Duplex
 * @interface
 * @implements Readable
 * @implements Writable
 * @implements EventEmitter
 */

/**
 * @method
 * @name Readable#on
 * @alias Writable#on
 * @param {string} event
 * @param (function} handler
 * @returns {Readable}
 */

/**
 * @typedef {(Readable|Writable|Duplex|Parser)} Stream
 */

/**
 * @method
 * @name Readable#pipe
 * @param {Stream} out
 * @returns {Stream}
 */

/**
* @method
* @name Stream#pipe
* @param {Stream} out
* @returns {Stream}
*/


/*
* @method
* @name Parser#pipe
* @param {Stream} out
* @returns {Stream}
*/