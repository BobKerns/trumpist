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


function log(key, template) {
    return function (data) {
        try {
            // eslint-disable-next-line no-console
            console.log(`${key}: ${template(data)}`);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(`${key}: ${e.message || e}`);
        }
    };
}

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
    stream = new Transform({objectMode: true, transform: transform});
    return stream;
}

function sink(f) {
    let s = filter(v => ++s.count && f && f(v) && false);
    s.count = 0;
    return s;
}

function thru(f) {
    return filter(v => (f && f(v)) || true);
}

function split(input, ...outputs) {
    return Promise.all(outputs.map(o => pipeline(input, o)));
}

module.exports = {
    pipeline,
    log,
    sink,
    filter,
    thru,
    split,
    finished,
    done
};
