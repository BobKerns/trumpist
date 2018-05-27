/*
 * Copyright (c) 2018 Bob Kerns.
 */
"use Strict";

const {Readable} = require('stream');

class ResultStream extends Readable {
    constructor(options) {
        super({...options, objectMode: true});
        this.result = options.result;
        let stream = this;
        let summary_ok, summary_err, data_err;
        this.summary = new Promise((accept, reject) => {
            summary_ok = accept;
            summary_err = reject;
        }).then(() => {
            this.push(null);
        });
        function wait() {
            return new Promise((accept, reject) => {
                stream._continue = accept;
                data_err = reject;
            });
        }
        this.result.subscribe({
            onNext(record) {
                stream.reading.then(() => {
                    if (!stream.push(record)) {
                        stream.reading = wait();
                    }
                });
                return stream.reading;
            },
            async onCompleted(summary) {
                // We have to wait for any pending reading to finish.
                await stream.reading;
                summary_ok(summary);
            },
            onError(error) {
                stream.emit('error', error);
            }
        });
        this.reading = wait();
        this.on('error', (e) => {
            summary_err(e);
            data_err(e);
        });
    }

    _read() {
        this._continue();
    }
}

module.exports = {
    ResultStream: ResultStream,
    resultStream(result) {
        return new ResultStream({result});
    }
};