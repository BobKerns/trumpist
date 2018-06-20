/*
 * Copyright (c) 2018 Bob Kerns.
 */

'use strict';

import {create as createLog, Logger} from "../util/logging";
const defaultLog = createLog('databaseXXX');
import * as spi from "./spi";
import * as api from "./api";
import {Neo4JConnector, Neo4JConnector_3_4} from "../dbs/neo4j/neo4j-connector";
import {Maybe, SessionCallback} from "./spi";
import {CollectedResults, RecordStream, ResultIterator, Query, nextId} from "./api";
import {captureValue, Future, future} from "../util/future";
import {AnyParams, Nullable} from "../util/types";

export interface DbOptions {
    /** The type of the database. Currently must be "neo4j" or "neo4j@3.4" */
    database: string;
    /** The parameters to the underlying database. */
    parameters?: {[k: string]: any};
    /** Logger to log to. */
    log?: Logger;
    /** An optional identifier to denote this source. Defaults to database. */
    id?: string;
}

type Wrapper<O, T> = (outer: O) => Maybe<T>;
type Wrapped<I, T> = (inner: (i: I) => Promise<T>) => Promise<T>;


class Base<P extends api.PMarker | undefined, S extends spi.Marker> implements api.Marker {
    public readonly log: Logger;
    public readonly database: string;
    public readonly id: string;

    protected spiObjectFuture: Future<S>;
    protected readonly parent: P;

    /**
     * Defer constructing our SPI instance until it's actually needed, to avoid circular dependencies in constructor
     * execution.
     */
    protected get spiObject() {
        return this.spiObjectFuture.value;
    }

    constructor(spiObject: (self: Base<any, any>) => S, parent: P, parentDb?: string, parentLog?: Logger) {
        this.spiObjectFuture = future(() => spiObject(this));
        this.log = (parentLog || parent && parent!.log || defaultLog);
        this.database = parentDb || parent && parent!.database || "DB";
        this.parent = parent;
        this.id = `${(parent && parent!.id) || parentDb || this.database}/${nextId()}`;
    }

    protected callbackWrapper<O, I, T, C extends (outer: O) => Maybe<T>>(
        outerfn: (i: I) => O,
        innerfn: (inner: I) => void,
        cb: C):
        (inner: I) => Promise<T> {
        return async (inner: I): Promise<T> => {
            innerfn(inner);
            return Promise.resolve(cb(outerfn(inner)));
        };
    }

    protected async invokeInner<O, I, T, C extends Wrapper<O, T>>(
        key: string, description: string,
        outerfn: (inner: I) => O,
        fn: C,
        ex: Wrapped<I, T>) {

        const log = this.log;
        try {
            log.debug(`${key}BEG beginning ${description}.`);
            let inner: I;
            const val: T = await ex(this.callbackWrapper<O, I, T, C>(outerfn, (i: I) => {
                    inner = i;
                }, fn));
            log.debug(`${key}END ${description} returns ${val}`);
            return val;
        } catch (e) {
            log.debug(`${key}ERR ${description} throws ${e.message}`, e);
            throw e;
        }
    }
}

/**
 * Abstracted factory access to the database, allowing substitution (e.g. mocking) and enforcing consistent
 * usage patterns (e.g. proper closing, error checking, etc.)
 *
 * Instantiating this is for configuration only. No external work is done until [[DatabaseAccess.withDatabase]] is
 * called (at the earliest).
 */
export default class DatabaseAccess extends Base<undefined, spi.Provider> implements spi.Marker {

    private static createSPI(options: DbOptions, self: DatabaseAccess): spi.Provider {
        const {database, log} = options;
        const params: spi.ConnectionParameters = ((
            options.parameters
            || {
                database,
                log: (log || defaultLog),
            }) as spi.ConnectionParameters);
        const factory = spi.getProviderFactory(database);
        if (!factory) {
            throw new Error(`The database "${database}" is not supported.`);
        }
        return factory(self, params);
    }

    /**
     * Create a Database Access object.
     */
    constructor(options: DbOptions) {
        const {database, log} = options;
        const logDBA = (log || defaultLog).getChild("DBA");
        // options = {...options, log: logDBA};
        const createSPI = (self: Base<any, any>) => DatabaseAccess.createSPI(options, self as DatabaseAccess);
        super(createSPI, undefined, database, logDBA);
    }

    /**
     * Access the database, ensuring cleanup.
     * @param fn Callback that performs work with access to this database.
     * @returns a `Promise` with the value of `fn`, or reflecting any error thrown.
     */
    public async withDatabase<T>(fn: api.DatabaseCallback<T>): Promise<T> {
        const newOuter = ((inner: spi.Database) => new Database(inner, this));
        const {value: apiValue, wrapped: apiCreate} = captureValue(newOuter);
        const exfn: Wrapped<spi.Database, T> =
            async (cb): Promise<T> =>
                this.spiObject.withDatabase<T>(apiValue, cb);
        return this.invokeInner<api.Database, spi.Database, T, api.DatabaseCallback<T>>(
            'DRV', 'DB Driver',
            apiCreate, fn, exfn);
    }
}

/**
 * A Driver wrapper for the underlying driver implementation that serves as a factory for connections.
 */
export class Database extends Base<DatabaseAccess, spi.Database> implements api.Database {
    // Internal
    constructor(driver: spi.Database, parent: DatabaseAccess) {
        super(() => driver, parent);
    }

    /**
     * Connect to the database and prepare to begin issuing transactions.
     *
     * @param cb The function that executes with this session
     * @param writeAccess true if write access is needed.
     * @returns the return value from the session
     */
    public async withSession<T>(mode: api.Mode, fn: api.SessionCallback<T>): Promise<T> {
        const newOuter = ((inner: spi.Session) => new Session(inner, this, mode));
        const {value: apiValue, wrapped: apiCreate} = captureValue(newOuter);
        const exfn: Wrapped<spi.Session, T> =
            async (cb): Promise<T> =>
                this.spiObject.withSession<T>(mode, apiValue, cb);
        return this.invokeInner<api.Session, spi.Session, T, api.SessionCallback<T>>(
            'SES', 'DB Session',
            apiCreate, fn, exfn);
    }

    /**
     * Close the database and any open connections.
     */
    public async close() {
        return this.spiObject.close();
    }
}

/**
 * Session object exposed to the application code. Factory for transactions.
 */
export class Session extends Base<Database, spi.Session> implements api.Session {
    public readonly mode: api.Mode;
    constructor(session: spi.Session, parent: Database, mode: api.Mode) {
        super(() => session, parent);
        this.mode = mode;
    }

    /**
     * Execute a transaction. It will be committed on successful completion, or rolled back on error.
     */
    public async withTransaction<T>(mode: api.Mode, fn: api.TransactionCallback<T>): Promise<T> {
        const newOuter = ((inner: spi.Transaction) => new Transaction(inner, this, mode));
        const {value: apiValue, wrapped: apiCreate} = captureValue(newOuter);
        const exfn: Wrapped<spi.Transaction, T> =
            (cb): Promise<T> => {
                const wrapped: spi.TransactionCallback<T> = async (tx: spi.Transaction): Promise<T>  => {
                    try {
                        const val = await cb(tx);
                        if (mode === api.Mode.WRITE) {
                            await tx.commit();
                        }
                        return val;
                    } catch (e) {
                        if (mode === api.Mode.WRITE) {
                            await tx.rollback(e);
                        }
                        throw e;
                    }
                };
                return this.spiObject.withTransaction<T>(mode, apiValue, cb);
            };
        return this.invokeInner<api.Transaction, spi.Transaction, T, api.TransactionCallback<T>>(
            'TX.', 'DB Transaction',
            apiCreate, fn, exfn);
    }

    public query(q: api.Query, params?: object | undefined): Promise<api.CollectedResults> {
        return this.withTransaction(api.Mode.WRITE, tx => tx.query(q, params));
    }

    /** Perform a shortcut query, and obtain the results as a stream. */
    public queryStream(query: Query, params?: object): Promise<RecordStream> {
        return this.withTransaction(api.Mode.WRITE, tx => tx.queryStream(query, params));
    }

    /** Perform a shortcut query, and obtain the results via async iteration. */
    public queryIterator(query: Query, params?: object): Promise<ResultIterator> {
        return this.withTransaction(api.Mode.WRITE, tx => tx.queryIterator(query, params));
    }
    /**
     * Close the session, freeing any resources
     */
    public async close(): Promise<void> {
        return this.spiObject.close();
    }
}

/**
 * The transaction object presented to application code
 */
export class Transaction extends Base<Session, spi.Transaction> implements  api.Transaction {
    public readonly mode: api.Mode;
    constructor(transaction: spi.Transaction, parent: Session, mode: api.Mode) {
        super(() => transaction, parent);
        this.mode = mode;
    }

    /**
     * Execute a query.
     * @param query The query to execute. It must be fully resolvable with the supplied params
     * @param params Parameters to flesh out the query.
     */
    public async run<T>(query: api.Query, params: AnyParams, fn: (q: api.Query, p: AnyParams) => T) {
        const name = `${query.name || 'anon'}:${this.id}:${nextId()}`;
        const log = this.log;
        try {
            log.debug(`TXRUN: ${name} GO`);
            const val = await fn(query, params);
            await this.commit();
            log.debug(`TXRUN: ${name} OK`);
            return val;
        } catch (e) {
            log.error(`TXRUN: ${name} FAIL: ${e.message}\n${e.stack}`);
            await this.rollback(e);
            throw e;
        }
    }

    /**
     * Give the implementation a chance to roll back if it doesn't do so organically on withTransaction.
     * @param e The cause for rollback, probably ignored.
     */
    private async rollback(e: Error): Promise<void> {
        return this.spiObject.rollback(e);
    }

    /**
     * Give the implementation a chance to roll back if it doesn't do so organically on withTransaction.
     */
    private async commit(): Promise<void> {
        return this.spiObject.commit();
    }

    /** Perform a query and obtain the collected results all at once. */
    public async query(query: Query, params: object= {}): Promise<CollectedResults> {
        return this.run(query, params, () => this.spiObject.query(query, params));
    }

    /** Perform a query, and obtain the results as a stream. */
    public async queryStream(query: Query, params: object= {}): Promise<RecordStream> {
        return this.run(query, params, () => this.spiObject.queryStream(query, params));
    }
    /** Perform a query, and obtain the results via async iteration. */
    public async queryIterator(query: Query, params: object= {}): Promise<ResultIterator> {
        return this.run(query, params, () => this.spiObject.queryIterator(query, params));
    }
}

export {
    Query,
    Record, ResultSummary,
    RecordStream, RecordIterableIterator,
    CollectedResults,
} from "./api";
