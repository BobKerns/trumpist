/*
 * Copyright (c) 2018 Bob Kerns.
 */
"use Strict";

import {Readable} from "stream";
import {api, spi} from "../../database";
import CollectedResults = api.CollectedResults;
import {Query} from "../../database/spi";
import {QueryExpansion} from "../../database/api";
import {ManualPromise, once} from "../../util/future";
import {PromiseFinally, PromiseReject} from "../../util/types";
import {RDFCore} from "./rdf-connector";

/**
 * A stream of results from the database.
 */
export class RDFRecordStream extends spi.RecordStream
    implements
        api.ResultSummaryProvider,
        spi.RecordStream {
    private readonly query: QueryExpansion;
    private readonly transaction: RDFCore.Transaction;
    private readCount: number = 0;
    private readonly _summary: ManualPromise<RDFCore.ResultSummary> = new ManualPromise<RDFCore.ResultSummary>();
    protected readonly summary: Promise<api.ResultSummary> = this._summary.then(s => new spi.ResultSummary({
        ...s,
        createCount: -1,
        readCount: this.readCount,
        modifiedCount: 0,
        elapsedTime: -1,
    }));

    constructor(tx: RDFCore.Transaction, query: QueryExpansion) {
        super();
        this.transaction = tx;
        this.query = query;
        // The summary marks the end of data.
        this._summary
            .then(() => this.push(null))
            .catch(e => this.emit('error', e));
        this.on('error', (e) => {
            this._summary.reject(e);
            // No rollback, but we should be rolling back the outer.
        });
    }

    private _doRead = once(() => {
        // This should be passing through the outer transaction.
        const result = this.transaction.run(this.query.statement, this.query.parameters);
        const stream = this;
        result.subscribe({
            onNext(r: RDFCore.Record) {
                stream.readCount++;
                stream.push(r);
            },
            onCompleted(summary: RDFCore.ResultSummary) {
                stream._summary.resolve(summary);
            },
            onError(err: Error) {
                stream._summary.reject(err);
            },
        });
    });

    public _read() {
        this._doRead();
    }

    public async getResultSummary(): Promise<api.ResultSummary> {
        return this.summary;
    }
}
