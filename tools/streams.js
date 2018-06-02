/*
 * Copyright (c) 2018 Bob Kerns.
 */

/**
 * @module streams
 */

"use strict";
const util = require('util');
const {
    /**
     * @memberOf module:streams
     * @external Transform
     * @extends module:streams.Readable
     * @extends module:streams.Writable
     * @interface
     * @private
     * */
    Transform,
    /**
     * @memberOf module:streams
     * @external Readable
     * @interface
     * @private
     * */
    Readable,
    /**
     * @memberOf module:streams
     * @external Duplex
     * @extends module:streams.Readable
     * @extends module:streams.Writable
     * @private
     * @interface
     * */
    Duplex,
    /**
     * @memberOf module:streams
     * @external Writable
     * @private
     * @interface
     * */
    Writable, pipeline: s_pipeline, finished: s_finished } = require('stream');
const pipeline = util.promisify(s_pipeline);
const finished = util.promisify(s_finished);

/** @type Duplex */
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
 * @param {module:streams~filterCallback} f
 * @returns {module:streams.Duplex}
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
 * @callback module:streams~filterCallback
 * @param f
 * @returns {boolean}
 */

/**
 * Produce an output stream to serve as destination.
 * @param {module:streams~sinkCallback} f
 * @returns {module:streams.Writable}
 */
function sink(f) {
    /* @type {module:streams.Writable} */
    let s = filter(v => ++s.count && f && f(v) && false);
    s.count = 0;
    return s;
}
/**
  * @callback module:streams~sinkCallback
 * @param data
 * @returns {void}
 */

/**
 * @callback module:streams~thruCallback
 * @param data
 * @return {*}
 */

/**
 * Produce a stream that processes output
 * @param {module:streams~thruCallback} f
 * @returns {module:streams.Duplex}
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
 @method
 @name module:streams.Writable~on
 @param {string} key
 @param handler
 */

/**
 @method
 @name module:streams.Readable~pipe
 @param {Writable|Parser} out
 @returns {Readable}
 */