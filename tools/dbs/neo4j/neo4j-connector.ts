/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {v1 as neo4j} from './neo4j-driver/index';
import * as spi from "../../database/spi";
import * as api from "../../database/api";

import DatabaseAccess from "../../database/database-access";
import {Logger} from "../../util/logging";
import {future, Future} from "../../util/future";
import {AnyParams} from "../../util/types";
import Transaction from "neo4j-driver/types/v1/transaction";
import {tryCatch} from "ramda";
import {ConnectionParameters, RecordStream} from "../../database/spi";
import {ResultStream} from "../../database/result-stream";
import {Neo4jRecordStream} from "./neo4j-record-stream";


interface Neo4JParams extends spi.ConnectionParameters {
    url: string;
    user: string;
    password: string;
}

/**
 * Provider for Neo4J 3.4 database.
 */
export class Neo4JConnector_3_4 extends spi.ProviderImpl<neo4j.Driver> {
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
        const {url, user, password, log} = parameters as Neo4JParams;
        this.url = url;
        this.user = user;
        this.password = password;
    }

    public async invoke<T>(mode: api.Mode, fn: (impl: neo4j.Driver) => Promise<T>): Promise<T> {

        const neoDriver = neo4j.driver(this.url, neo4j.auth.basic(this.user, this.password));
        return await fn(neoDriver);
    }

    public newSPI(mode: api.Mode, outer: () => api.Database, impl: neo4j.Driver): Neo4JDriver {
        return new Neo4JDriver(future(outer), impl, this);
    }
}
type NeoDriver = neo4j.Driver;

export class Neo4JConnector extends Neo4JConnector_3_4 {
    constructor(outer: DatabaseAccess, parent: DatabaseAccess, parameters: spi.ConnectionParameters) {
        super(future(() => outer), parent, parameters);
    }
}

function convertMode(mode: api.Mode): neo4j.SessionMode {
    switch (mode) {
        case api.Mode.READ: return neo4j.session.READ;
        case api.Mode.WRITE: return neo4j.session.WRITE;
    }
}

class Neo4JDriver extends spi.DatabaseImpl<neo4j.Driver, neo4j.Session> {
    constructor(outer: Future<api.Database>, driver: neo4j.Driver, parent: Neo4JConnector_3_4) {
        super(driver, outer, parent);
    }

    /** @inheritDoc */
    public async withSession<T, I>(mode: api.Mode, outer: (inner: spi.Session) => api.Session, fn: spi.SessionCallback<T>): Promise<T> {
        const impl: neo4j.Session = (await this.impl).session(convertMode(mode));
        const session: spi.Session = new Neo4JSession(() => impl, future(() => outer(session)), this);
        try {
            this.log.trace(`NEO4J SSBEG ${this.id}/??`);
            const val = await fn(session);
            this.log.trace(`NEO4J SSEND ${session.id}: ${val}`);
            return val;
        } catch (e) {
            this.log.trace(`NEO4J SSERR ${session.id}`);
            throw e;
        } finally {
            await new Promise((accept, reject) => impl.close(accept));
        }
    }

    /** @inheritDoc */
    public async close() {
        return (await this.impl).close();
    }

    public async invoke<T>(mode: api.Mode, cb: (impl: neo4j.Session) => Promise<T>): Promise<T> {
        return cb(this.impl.session(convertMode(mode)));
    }

    public newSPI(mode: api.Mode, outer: () => api.Session, impl: neo4j.Session): Neo4JSession {
        return new Neo4JSession(() => impl, future(outer), this);
    }
}

/**
 * A Neo4J-specific session wrapper that implements our interface (which is very close to the Neo4J interface).
 */
class Neo4JSession extends spi.SessionImpl<neo4j.Session, neo4j.Transaction> {
    constructor(session: () => neo4j.Session, outer: Future<api.Session>, parent: spi.Database) {
        super(session(), outer, parent);
    }

    /** @inheritDoc */
    public async withTransaction<T>(mode: api.Mode, outer: (inner: spi.Transaction) => api.Transaction, fn: spi.TransactionCallback<T>) {
        const session = await this.impl;
        const txfn = async (tx: spi.Transaction) => {
            try {
                this.log.trace(`NEO4J TXBEG: ${this.id}/??`);
                const val = await fn(tx);
                this.log.trace(`NEO4J TXEND: ${tx.id}: ${val}`);
                return val;
            } catch (e) {
                this.log.trace(`NEO4J TXERR: ${tx.id} ${e.message}`);
                throw e;
            }
        };
        try {
            const spiTx = (itx: neo4j.Transaction) => {
                const inner: spi.Transaction = new Neo4JTransaction(itx, future(() => outer(inner)), this);
                return inner;
            };
            if (mode === api.Mode.WRITE) {
                return await session.writeTransaction(tx => txfn(spiTx(tx)));
            } else {
                return await session.readTransaction(tx => txfn(spiTx(tx)));
            }
        } catch (e) {
            this.log.trace(`NEO4J SESERR TXERR OUTER: ${this.id} ${e.message}`);
            throw e;
        }
    }

    /** @inheritDoc */
    public async close() {
        return (await this.impl).close();
    }

    public async invoke<T>(mode: api.Mode, cb: (impl: neo4j.Transaction) => Promise<T>): Promise<T> {
        switch (mode) {
            case api.Mode.READ:
                return this.impl.readTransaction(tx => cb(tx));
            case api.Mode.WRITE:
                return this.impl.writeTransaction(tx => cb(tx));
        }
    }

    public newSPI(mode: api.Mode, outer: () => api.Transaction, impl: neo4j.Transaction): Neo4JTransaction {
        return new Neo4JTransaction(impl, future(outer), this);
    }
}

/**
 * A Neo4J-specific transaction wrapper that implements our interface (which is very close to the Neo4J interface).
 */
class Neo4JTransaction extends spi.TransactionImpl<neo4j.Transaction> {
    constructor(transaction: neo4j.Transaction, outer: Future<api.Transaction>, parent: Neo4JSession) {
        super(transaction, outer, parent);
    }

    /** @inheritDoc */
    private async run(query: spi.Query, params: AnyParams): Promise<neo4j.StatementResult> {
        try {
            this.log.trace(`NEO4J QBEG ${this.id}: ${query.name || 'anon'}`);
            const {statement, parameters} = query.expand(params);
            const val: neo4j.StatementResult = await (await this.impl).run(statement, parameters);
            this.log.trace(`NEO4J QEND ${this.id}: ${query.name || 'anon'} - ${val}`);
            return val;
        } catch (e) {
            this.log.trace(`NEO4J QERR ${this.id}: ${query.name} ${e.message}`);
            throw e;
        }
    }

    public async query(query: spi.Query, params: object): Promise<api.CollectedResults> {
        const result = await this.run(query, params);
        return new Neo4JCollectedResults(result);
    }
    public async queryStream(query: spi.Query, params: object): Promise<spi.RecordStream> {
        try {
            this.log.trace(`NEO4J QSTREAM ${this.id}: ${query.name || 'anon'}`);
            return new Neo4jRecordStream(this.impl, query.expand(params));
        } catch (e) {
            this.log.trace(`NEO4J QERR ${this.id}: ${query.name} ${e.message}`);
            throw e;
        }
    }
    public async queryIterator(query: spi.Query, params: object): Promise<spi.ResultIterator> {
        throw new Error("Not Implemented");
    }
}

class Neo4JCollectedResults extends spi.CollectedResults {
    private result: neo4j.StatementResult;
    constructor(result: neo4j.StatementResult) {
        super();
        this.result = result;
    }
    public async getResultSummary(): Promise<api.ResultSummary> {
        const records = await this.getResults();
        const readCount = (records && records.length) || 0;
        return new Neo4JResultSummary((await this.result).summary, readCount);
    }

    public async getResults(): Promise<api.Record[]> {
        return (await this.result).records.map(r => new Neo4JRecord(r));
    }
}

class Neo4JResultSummary extends spi.ResultSummary {
    private readonly summary: neo4j.ResultSummary;
    constructor(summary: neo4j.ResultSummary, readCount: number) {
        super({
            ...summary,
            readCount: readCount,
            createCount: summary.counters.nodesCreated() + summary.counters.relationshipsCreated(),
            modifiedCount: summary.counters.containsUpdates() ? 1 : 0,
            elapsedTime: neo4j.integer.toNumber(summary.resultConsumedAfter),
        });
        this.summary = summary;
    }
}

class Neo4JRecord implements api.Record {
    private readonly record: neo4j.types.Record;
    constructor(r: neo4j.types.Record) {
        this.record = r;
    }
    public get(key: string): any {
        return this.record.get(key);
    }
}

spi.registerProviderFactory('neo4j', (parent, params) => new Neo4JConnector(parent, parent, params));
