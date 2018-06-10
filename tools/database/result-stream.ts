/*
 * Copyright (c) 2018 Bob Kerns.
 */
"use Strict";

import {Readable} from "stream";
import * as neo4j from "./neo4j";


interface ResultStreamOptions {
    result: neo4j.Result;
}

type NeoResult = neo4j.ResultSummary<number>;
type Accept<T> = (accept: T) => void;
type Reject<T= Error> = (reject?: T) => void;

/**
 * A stream of results from the database.
 */
export class ResultStream extends Readable {
    private result: neo4j.Result;
    private summary: Promise<NeoResult>;
    private continue: Accept<undefined>;
    private reading: Promise<void>;
    constructor(options: ResultStreamOptions) {
        super({objectMode: true});
        this.result = options.result;
        const stream = this;
        let summaryOk: Accept<NeoResult>;
        let summaryErr: Reject;
        let dataErr: Reject;
        this.summary = new Promise<NeoResult>((accept: Accept<NeoResult>, reject: Reject) => {
            summaryOk = accept;
            summaryErr = reject;
        }).then((summary) => {
            this.push(null);
            return summary;
        });
        function wait() {
            return new Promise((accept: Accept<void>, reject) => {
                stream.continue = accept;
                dataErr = reject;
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
            async onCompleted(summary: neo4j.ResultSummary<any>) {
                // We have to wait for any pending reading to finish.
                await stream.reading;
                summaryOk(summary);
            },
            onError(error: Error) {
                stream.emit('error', error);
            },
        });
        this.reading = wait();
        this.on('error', (e) => {
            summaryErr(e);
            dataErr(e);
        });
    }

    _read() {
        this.continue(undefined);
    }
}

export function resultStream(result: neo4j.Result): ResultStream {
    return new ResultStream({result});
}
