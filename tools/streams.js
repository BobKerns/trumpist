/*
 * Copyright (c) 2018 Bob Kerns.
 */

/**
 * @module streams
 */

"use strict";
const util = require('util');
const { Transform,
    /** @interface */
    Readable,
    Duplex, Writable, pipeline: s_pipeline, finished: s_finished } = require('stream');
const pipeline = util.promisify(s_pipeline);
const finished = util.promisify(s_finished);

/** @type external:Duplex */
const Bomstrip = require('bomstrip');

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
 * @returns {external:Duplex}
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
 * @returns {external:Writable}
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
 * @returns {external:Duplex}
 */
function thru(f) {
    return filter(v => (f && f(v)) || true);
}

function split(input, ...outputs) {
    return Promise.all(outputs.map(o => pipeline(input, o)));
}

module.exports = {
    Readable,
    Writable,
    Duplex,
    Transform,
    pipeline,
    logstream: logstream,
    sink,
    filter,
    thru,
    split,
    finished,
    done,
    Bomstrip
};

/**
 * JSDOoc declarations to inform the type inferencing so we don't get spurious warnings.
 */

/**
 * @interface external:Stream
 */

/**
 * @interface external:Parser
 * @implements external:Stream
 */

/**
 * @interface external:Writable
 * @implements external:Stream
 */


/**
 * @interface external:Duplex
 * @implements Readable
 * @implements external:Writable
 * @implements external:Stream
 */

/**
 * @method
 * @name external:Writable~on
 * @param {string} event
 * @param {function():*} handler
 * @returns {external:Stream}
 */

/**
 * @method
 * @name Readable~pipe
 * @param {external:Writable} out
 * @returns {external:Writable}
 */

/**
 * @method
 * @name external:Duplex~pipe
 * @param {external:Writable} out
 * @returns {external:Writable}
 */
