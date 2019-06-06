/*
 * Copyright (c) 2018 Bob Kerns.
 */

/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as spi from "../../database/spi";
import * as api from "../../database/api";

import DatabaseAccess from "../../database/database-access";
import {Logger} from "../../util/logging";
import {future, Future} from "../../util/future";
import {AnyParams} from "../../util/types";
import {tryCatch} from "ramda";
import {ConnectionParameters, RecordStream} from "../../database/spi";
import {ResultStream} from "../../database/result-stream";
import * as util from "util";
import {MemRecordStream} from "./mem-record-stream";

interface MemParams extends spi.ConnectionParameters {
    url: string;
    user: string;
    password: string;
}

export namespace MemCore {
    export interface Driver {readonly type: "DRIVER"; }
    export interface Session {readonly type: "SESSION"; }
    export class Transaction {
        public readonly type: "TRANSACTION" = "TRANSACTION";
        public run() {

        }
    }
    export interface StatementResult {
        readonly type: "RESULT";
        readonly summary: ResultSummary;
        readonly records: Record[];
    }
    export interface ResultSummary {
        readonly type: "SUMMARY";
        counters: {
            readCount: number;
            createCount: number;
            modifiedCount: number;
            elapsedTime: number;
        };
    }
    export interface Record {
        readonly type: "RECORD";
        get(key: string): any;
    }
}



/**
 * Provider for Mem
 */
export class MemConnector extends spi.ProviderImpl<MemCore.Driver> {
    public parent: DatabaseAccess;
    public log: Logger;
    protected url: string;
    protected user: string;
    protected password: string;

    /**
     * See [[DatabaseAccess]]
     * @param  parent   The [[DatabaseAccess]] instance that instantiated this connector.
     * @param options
     * @param options.url
     * @param options.user
     * @param options.password
     */
    constructor(outer: Future<DatabaseAccess>, parent: DatabaseAccess, parameters: spi.ConnectionParameters) {
        super(outer, parent, parameters);
        const {url, user, password, log} = parameters as MemParams;
        this.url = url;
        this.user = user;
        this.password = password;
    }

    public async invoke<T>(mode: api.Mode, fn: (impl: MemCore.Driver) => Promise<T>): Promise<T> {
        return await fn({type: "DRIVER"});
    }

    public newSPI(mode: api.Mode, outer: () => api.Database, impl: MemCore.Driver): MemDriver {
        return new MemDriver(future(outer), {type: "DRIVER"}, this);
    }
}

class MemDriver extends spi.DatabaseImpl<MemCore.Driver, MemCore.Session> {
    constructor(outer: Future<api.Database>, driver: MemCore.Driver, parent: MemConnector) {
        super(driver, outer, parent);
    }

    /** @inheritDoc */
    public async withSession<T, I>(mode: api.Mode, outer: (inner: spi.Session) => api.Session, fn: spi.SessionCallback<T>): Promise<T> {
        const impl: MemCore.Session = {type: "SESSION"};
        const session: spi.Session = new MemSession(() => impl, future(() => outer(session)), this);
        try {
            this.log.trace(`Mem SSBEG ${this.id}/??`);
            const val = await fn(session);
            this.log.trace(`Mem SSEND ${session.id}: ${val}`);
            return val;
        } catch (e) {
            this.log.trace(`Mem SSERR ${session.id}`);
            throw e;
        } finally {
            // Nothing to close.
        }
    }

    /** @inheritDoc */
    public async close() {
        // Nothing to close
    }

    public async invoke<T>(mode: api.Mode, cb: (impl: MemCore.Session) => Promise<T>): Promise<T> {
        return cb({type: "SESSION"});
    }

    public newSPI(mode: api.Mode, outer: () => api.Session, impl: MemCore.Session): MemSession {
        return new MemSession(() => impl, future(outer), this);
    }
}

/**
 * A Neo4J-specific session wrapper that implements our interface (which is very close to the Neo4J interface).
 */
class MemSession extends spi.SessionImpl<MemCore.Session, MemCore.Transaction> {
    constructor(session: () => MemCore.Session, outer: Future<api.Session>, parent: spi.Database) {
        super(session(), outer, parent);
    }

    /** @inheritDoc */
    public async withTransaction<T>(mode: api.Mode, outer: (inner: spi.Transaction) => api.Transaction, fn: spi.TransactionCallback<T>) {
        const session = await this.impl;
        const txfn = async (tx: spi.Transaction) => {
            try {
                this.log.trace(`Mem TXBEG: ${this.id}/??`);
                const val = await fn(tx);
                this.log.trace(`Mem TXEND: ${tx.id}: ${val}`);
                return val;
            } catch (e) {
                this.log.trace(`Mem TXERR: ${tx.id} ${e.message}`);
                throw e;
            }
        };
        try {
            const spiTx = (itx: MemCore.Transaction) => {
                const inner: spi.Transaction = new MemTransaction(itx, future(() => outer(inner)), this);
                return inner;
            };
            return await txfn(spiTx(new MemCore.Transaction()));
        } catch (e) {
            this.log.trace(`Mem SESERR TXERR OUTER: ${this.id} ${e.message}`);
            throw e;
        }
    }

    /** @inheritDoc */
    public async close() {
        // Nothing to close
    }

    public async invoke<T>(mode: api.Mode, cb: (impl: MemCore.Transaction) => Promise<T>): Promise<T> {
        return cb(new MemCore.Transaction());
    }

    public newSPI(mode: api.Mode, outer: () => api.Transaction, impl: MemCore.Transaction): MemTransaction {
        return new MemTransaction(impl, future(outer), this);
    }
}

/**
 * A Neo4J-specific transaction wrapper that implements our interface (which is very close to the Neo4J interface).
 */
class MemTransaction extends spi.TransactionImpl<MemCore.Transaction> {
    constructor(transaction: MemCore.Transaction, outer: Future<api.Transaction>, parent: MemSession) {
        super(transaction, outer, parent);
    }

    /** @inheritDoc */
    private async run(query: spi.Query, params: AnyParams): Promise<MemCore.StatementResult> {
        try {
            this.log.trace(`Mem QBEG ${this.id}: ${query.name || 'anon'}`);
            const {statement, parameters} = query.expand(params);
            const val: MemCore.StatementResult = await (await this.impl).run(statement, parameters);
            this.log.trace(`Mem QEND ${this.id}: ${query.name || 'anon'} - ${val}`);
            return val;
        } catch (e) {
            this.log.trace(`Mem QERR ${this.id}: ${query.name} ${e.message}`);
            throw e;
        }
    }

    public async query(query: spi.Query, params: object): Promise<api.CollectedResults> {
        const result = await this.run(query, params);
        return new MemCollectedResults(result);
    }
    public async queryStream(query: spi.Query, params: object): Promise<spi.RecordStream> {
        try {
            this.log.trace(`Mem QSTREAM ${this.id}: ${query.name || 'anon'}`);
            return new MemRecordStream(this.impl, query.expand(params));
        } catch (e) {
            this.log.trace(`Mem QERR ${this.id}: ${query.name} ${e.message}`);
            throw e;
        }
    }
    public async queryIterator(query: spi.Query, params: object): Promise<spi.ResultIterator> {
        throw new Error("Not Implemented");
    }
}

class MemCollectedResults extends spi.CollectedResults {
    private result: MemCore.StatementResult;
    constructor(result: MemCore.StatementResult) {
        super();
        this.result = result;
    }
    public async getResultSummary(): Promise<api.ResultSummary> {
        const records = await this.getResults();
        const readCount = (records && records.length) || 0;
        return new MemResultSummary((await this.result).summary, readCount);
    }

    public async getResults(): Promise<api.Record[]> {
        return (await this.result).records.map(r => new Neo4JRecord(r));
    }
}

class MemResultSummary extends spi.ResultSummary {
    private readonly summary: MemCore.ResultSummary;
    constructor(summary: MemCore.ResultSummary, readCount: number) {
        super({
            ...summary,
            readCount: readCount,
            createCount: -1,
            modifiedCount: -1,
            elapsedTime: -1,
        });
        this.summary = summary;
    }
}

class Neo4JRecord implements api.Record {
    private readonly record: MemCore.Record;
    constructor(r: MemCore.Record) {
        this.record = r;
    }
    public get(key: string): any {
        this.record.get(key);
    }
}

spi.registerProviderFactory('neo4j', (parent, params) => new MemConnector(future(() => parent), parent, params));
