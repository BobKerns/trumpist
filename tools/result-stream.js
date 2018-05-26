/*
 * Copyright (c) 2018 Bob Kerns.
 */
"use Strict";

const {ReadStream} = require('stream');

class ResultStream extends ReadStream {
    constructor(options) {
        super({...options, objectMode: true});
        this.result = options.result;
        this.result.subscribe(this);
        this._wait();
    }

    _wait() {
        this.reading = new Promise((accept, reject) => {

        });
    }

    _read() {

    }
}

module.exports = {
  ResultStream: ResultStream
};