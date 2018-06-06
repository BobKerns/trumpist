/*
 * Copyright (c) 2018 Bob Kerns.
 */
"use Strict";

import {Readable} from "stream";
import * as neo4j from "./neo4j";

type ResultStreamOptions = {
    result: neo4j.Result;
};

type NeoResult = neo4j.ResultSummary<neo4j.Integer>;
type Accept<T> = (accept: T) => void;
type Reject<T=Error> = (reject?: T) => void;

/**
 * A stream of results from the database.
 */
export class ResultStream extends Readable {
    result: neo4j.Result;
    summary: Promise<NeoResult>;
    private continue: Accept<undefined>;
    private reading: Promise<void>;
    constructor(options: ResultStreamOptions) {
        super({objectMode: true});
        this.result = options.result;
        let stream = this;
        let summary_ok: Accept<NeoResult>,
            summary_err: Reject, data_err: Reject;
        this.summary = new Promise<NeoResult>((accept: Accept<NeoResult>, reject: Reject) => {
            summary_ok = accept;
            summary_err = reject;
        }).then((summary) => {
            this.push(null);
            return summary;
        });
        function wait() {
            return new Promise((accept: Accept<void>, reject) => {
                stream.continue = accept;
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
            async onCompleted(summary: neo4j.ResultSummary) {
                // We have to wait for any pending reading to finish.
                await stream.reading;
                summary_ok(summary);
            },
            onError(error: Error) {
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
        this.continue(undefined);
    }
}

export function resultStream(result: neo4j.Result): ResultStream {
    return new ResultStream({result});
}
