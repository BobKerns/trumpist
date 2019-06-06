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
import {RDFRecordStream} from "./rdf-record-stream";

interface RDFParams extends spi.ConnectionParameters {
    url: string;
    user: string;
    password: string;
}

export namespace RDFCore {
    export interface Driver {readonly type: "DRIVER"; }
    export interface Session {readonly type: "SESSION"; }
    export interface Transaction {readonly type: "TRANSACTION"; }
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
 * Provider for RDF
 */
export class RDFConnector extends spi.ProviderImpl<RDFCore.Driver> {
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
        const {url, user, password, log} = parameters as RDFParams;
        this.url = url;
        this.user = user;
        this.password = password;
    }

    public async invoke<T>(mode: api.Mode, fn: (impl: RDFCore.Driver) => Promise<T>): Promise<T> {
        return await fn({type: "DRIVER"});
    }

    public newSPI(mode: api.Mode, outer: () => api.Database, impl: RDFCore.Driver): RDFDriver {
        return new RDFDriver(future(outer), {type: "DRIVER"}, this);
    }
}

class RDFDriver extends spi.DatabaseImpl<RDFCore.Driver, RDFCore.Session> {
    constructor(outer: Future<api.Database>, driver: RDFCore.Driver, parent: RDFConnector) {
        super(driver, outer, parent);
    }

    /** @inheritDoc */
    public async withSession<T, I>(mode: api.Mode, outer: (inner: spi.Session) => api.Session, fn: spi.SessionCallback<T>): Promise<T> {
        const impl: RDFCore.Session = {type: "SESSION"};
        const session: spi.Session = new RDFSession(() => impl, future(() => outer(session)), this);
        try {
            this.log.trace(`RDF SSBEG ${this.id}/??`);
            const val = await fn(session);
            this.log.trace(`RDF SSEND ${session.id}: ${val}`);
            return val;
        } catch (e) {
            this.log.trace(`RDF SSERR ${session.id}`);
            throw e;
        } finally {
            // Nothing to close.
        }
    }

    /** @inheritDoc */
    public async close() {
        // Nothing to close
    }

    public async invoke<T>(mode: api.Mode, cb: (impl: RDFCore.Session) => Promise<T>): Promise<T> {
        return cb({type: "SESSION"});
    }

    public newSPI(mode: api.Mode, outer: () => api.Session, impl: RDFCore.Session): RDFSession {
        return new RDFSession(() => impl, future(outer), this);
    }
}

/**
 * A Neo4J-specific session wrapper that implements our interface (which is very close to the Neo4J interface).
 */
class RDFSession extends spi.SessionImpl<RDFCore.Session, RDFCore.Transaction> {
    constructor(session: () => RDFCore.Session, outer: Future<api.Session>, parent: spi.Database) {
        super(session(), outer, parent);
    }

    /** @inheritDoc */
    public async withTransaction<T>(mode: api.Mode, outer: (inner: spi.Transaction) => api.Transaction, fn: spi.TransactionCallback<T>) {
        const session = await this.impl;
        const txfn = async (tx: spi.Transaction) => {
            try {
                this.log.trace(`RDF TXBEG: ${this.id}/??`);
                const val = await fn(tx);
                this.log.trace(`RDF TXEND: ${tx.id}: ${val}`);
                return val;
            } catch (e) {
                this.log.trace(`RDF TXERR: ${tx.id} ${e.message}`);
                throw e;
            }
        };
        try {
            const spiTx = (itx: RDFCore.Transaction) => {
                const inner: spi.Transaction = new RDFTransaction(itx, future(() => outer(inner)), this);
                return inner;
            };
            return await txfn(spiTx({type: "TRANSACTION"}));
        } catch (e) {
            this.log.trace(`RDF SESERR TXERR OUTER: ${this.id} ${e.message}`);
            throw e;
        }
    }

    /** @inheritDoc */
    public async close() {
        // Nothing to close
    }

    public async invoke<T>(mode: api.Mode, cb: (impl: RDFCore.Transaction) => Promise<T>): Promise<T> {
        return cb({type: "TRANSACTION"});
    }

    public newSPI(mode: api.Mode, outer: () => api.Transaction, impl: RDFCore.Transaction): RDFTransaction {
        return new RDFTransaction(impl, future(outer), this);
    }
}

/**
 * A Neo4J-specific transaction wrapper that implements our interface (which is very close to the Neo4J interface).
 */
class RDFTransaction extends spi.TransactionImpl<RDFCore.Transaction> {
    constructor(transaction: RDFCore.Transaction, outer: Future<api.Transaction>, parent: RDFSession) {
        super(transaction, outer, parent);
    }

    /** @inheritDoc */
    private async run(query: spi.Query, params: AnyParams): Promise<RDFCore.StatementResult> {
        try {
            this.log.trace(`RDF QBEG ${this.id}: ${query.name || 'anon'}`);
            const {statement, parameters} = query.expand(params);
            const val: RDFCore.StatementResult = await (await this.impl).run(statement, parameters);
            this.log.trace(`RDF QEND ${this.id}: ${query.name || 'anon'} - ${val}`);
            return val;
        } catch (e) {
            this.log.trace(`RDF QERR ${this.id}: ${query.name} ${e.message}`);
            throw e;
        }
    }

    public async query(query: spi.Query, params: object): Promise<api.CollectedResults> {
        const result = await this.run(query, params);
        return new RDFCollectedResults(result);
    }
    public async queryStream(query: spi.Query, params: object): Promise<spi.RecordStream> {
        try {
            this.log.trace(`RDF QSTREAM ${this.id}: ${query.name || 'anon'}`);
            return new RDFRecordStream(this.impl, query.expand(params));
        } catch (e) {
            this.log.trace(`RDF QERR ${this.id}: ${query.name} ${e.message}`);
            throw e;
        }
    }
    public async queryIterator(query: spi.Query, params: object): Promise<spi.ResultIterator> {
        throw new Error("Not Implemented");
    }
}

class RDFCollectedResults extends spi.CollectedResults {
    private result: RDFCore.StatementResult;
    constructor(result: RDFCore.StatementResult) {
        super();
        this.result = result;
    }
    public async getResultSummary(): Promise<api.ResultSummary> {
        const records = await this.getResults();
        const readCount = (records && records.length) || 0;
        return new RDFResultSummary((await this.result).summary, readCount);
    }

    public async getResults(): Promise<api.Record[]> {
        return (await this.result).records.map(r => new Neo4JRecord(r));
    }
}

class RDFResultSummary extends spi.ResultSummary {
    private readonly summary: RDFCore.ResultSummary;
    constructor(summary: RDFCore.ResultSummary, readCount: number) {
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
    private readonly record: RDFCore.Record;
    constructor(r: RDFCore.Record) {
        this.record = r;
    }
    public get(key: string): any {
        this.record.get(key);
    }
}

spi.registerProviderFactory('neo4j', (parent, params) => new RDFConnector(future(() => parent), parent, params));
