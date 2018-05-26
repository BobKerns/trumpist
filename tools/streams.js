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
        stream.on('close', () => resolve(stream));
        stream.on('finish', () => resolve(stream));
        stream.on('error', (e) => reject(e));
    });
}


function log(key, template) {
    return function (data) {
        try {
            console.log(`${key}: ${template(data)}`);
        } catch (e) {
            console.error(`${key}: ${e.message || e}`);
        }
    };
}

function filter(f, pass_through = false) {
    let stream;
    async function transform(obj, encoding, cb) {
        try {
            let p = f && f(obj);
            p = await p;
            if (p || pass_through) {
                stream.push(obj);
            }
            cb();
        } catch (e) {
            console.error(`Error in filter: ${util.inspect(e)}`)
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
    return Promise.all(outputs.map(o => pipeline(input, o).then(s => {console.log('SPLIT'); return s;})));
}

module.exports = {
    pipeline: pipeline,
    log: log,
    sink: sink,
    filter: filter,
    thru: thru,
    split: split,
    finished: finished,
    done: done
};
