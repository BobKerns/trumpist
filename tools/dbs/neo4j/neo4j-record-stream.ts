/*
 * Copyright (c) 2018 Bob Kerns.
 */
"use Strict";

import {Readable} from "stream";
import {v1 as neo4j} from "./neo4j-driver";
import {api, spi} from "../../database";
import CollectedResults = api.CollectedResults;
import {Query} from "../../database/spi";
import {QueryExpansion} from "../../database/api";
import {ManualPromise, once} from "../../util/future";
import {PromiseFinally, PromiseReject} from "../../util/types";

/**
 * A stream of results from the database.
 */
export class Neo4jRecordStream extends spi.RecordStream
    implements
        api.ResultSummaryProvider,
        spi.RecordStream {
    private readonly query: QueryExpansion;
    private readonly transaction: neo4j.Transaction;
    private readCount: number = 0;
    private readonly _summary: ManualPromise<neo4j.ResultSummary> = new ManualPromise<neo4j.ResultSummary>();
    protected readonly summary: Promise<api.ResultSummary> = this._summary.then(s => new spi.ResultSummary({
        ...s,
        createCount: s.counters.nodesCreated() + s.counters.relationshipsCreated(),
        readCount: this.readCount,
        modifiedCount: s.counters.containsUpdates() ? 1 : 0,
        elapsedTime: neo4j.integer.toNumber(s.resultConsumedAfter),
    }));

    constructor(tx: neo4j.Transaction, query: QueryExpansion) {
        super();
        this.transaction = tx;
        this.query = query;
        // The summary marks the end of data.
        this._summary
            .then(() => this.push(null))
            .catch(e => this.emit('error', e));
        this.on('error', (e) => {
            this._summary.reject(e);
            tx.rollback();
        });
    }

    private _doRead = once(() => {
        const result = this.transaction.run(this.query.statement, this.query.parameters);
        const stream = this;
        result.subscribe({
            onNext(r: neo4j.types.Record) {
                stream.readCount++;
                stream.push(r);
            },
            onCompleted(summary: neo4j.ResultSummary) {
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
