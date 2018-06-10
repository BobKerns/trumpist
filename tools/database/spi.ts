/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {Readable} from "stream";
import {Logger} from "../util/logging";

import * as api from "./api";
import {seconds, Maybe, ConnectionParameters, nextId, Parent} from "./api";

export {seconds, Maybe, ConnectionParameters} from "./api";
export {Logger} from "../util/logging";

import DatabaseAccess from "./database-access";
import {Record} from "./api";
import {Future, future} from "../util/future";

// A marker for api vs spi classes
export interface Marker {

}

type BaseFutureKeys = "log" | "database" | "id" | "outer";

export abstract class Base<O extends api.Marker & api.Parent, P extends Parent & Marker, I> {
    private readonly _outer: Future<O>;
    get log() { return this.outer.log; }
    get database() { return this.outer.database; }
    get id() { return `[${this.outer.id}]`; }
    get outer() { return this._outer.value; }
    get impl(): Maybe<I> { return this._impl.value; }

    protected readonly _impl: Future<Maybe<I>>;
    protected readonly parent?: P;

    protected constructor(impl: (otter: O) => I, outer: Future<O>, parent: P, parentDb?: string) {
        this._outer = outer;
        this._impl = future(() => impl(this.outer));
        this.parent = parent;
    }
}


/**  Callback for receiving a [[Database]] at the internal SPI level. */
export type DatabaseCallback<T> = (db: Database) => Maybe<T>;
/**  Callback for receiving a [[Session]] at the internal SPI level. */
export type SessionCallback<T> = (session: Session) => Maybe<T>;
/**  Callback for receiving a [[Transaction]] at the internal SPI level. */
export type TransactionCallback<T> = (tx: Transaction) => Maybe<T>;

/**
 * This is what to implement to provide a different database connection
 * The implementation of [[Provider]] needs wrapper implementations for the following:
 * * [[Database]]
 * * [[Session]]
 * * [[Transaction]]
 * * [[Record]]
 * * [[ResultSummary]]
 * * [[RecordStream]]
 */

export interface Provider extends Parent, Marker {
    /** Access a database, disposing of any resources when done. */
    withDatabase<T>(outer: () => api.Database, cb: DatabaseCallback<T>): Promise<T>;

    /**
     * Override this with any needed cleanup
     */
    close(): Promise<void>;
}

export abstract class ProviderImpl extends Base<DatabaseAccess, DatabaseAccess, ConnectionParameters> implements Provider {
    protected constructor(outer: Future<DatabaseAccess>, parent: DatabaseAccess, parameters: ConnectionParameters) {
        super(() => parameters, outer, parent);
    }

    /** Access a database, disposing of any resources when done. */
    public abstract withDatabase<T>(outer: () => api.Database, cb: DatabaseCallback<T>): Promise<T>;

    /**
     * Override this with any needed cleanup
     */
    public async close(): Promise<void> {
    }
}

export interface Database extends Parent, Marker {
    /** Obtain a session to begin a series of transactions. */
    withSession<T>(outer: () => api.Session, cb: SessionCallback<T>, writeAccess: boolean): Promise<T>;

    close(): Promise<void>;
}

/**
 * This represents a particularized access, e.g. a configured driver ready to
 * provide sessions/connections. Shared between "threads" of execution.
 */
export abstract class DatabaseImpl<I> extends Base<api.Database, Provider, I> implements Database {
    protected constructor(impl: (otter: api.Database) => I, outer: Future<api.Database>, parent: Provider) {
        super(impl, outer, parent);
    }
    /** Obtain a session to begin a series of transactions. */
    public abstract withSession<T>(outer: () => api.Session, cb: SessionCallback<T>, writeAccess: boolean): Promise<T>;

    public async close(): Promise<void> {
    }
}

export interface Session extends Parent, Marker {
    /** Use a transaction to perform a series of queries. */
    withTransaction<T>(outer: () => api.Transaction, cb: TransactionCallback<T>, writeAccess: boolean): Promise<T>;
    /** Optional close implementation. */
    close(): Promise<void>;
}
/**
 * One interaction with the database. Must be used as "single-threaded" and not
 * be interleaved.
 */
export abstract class SessionImpl<I> extends Base<api.Session, Database, I> implements Session {
    protected constructor(impl: () => I,
                          outer: Future<api.Session>,
                          parent: Database) {
        super(impl, outer, parent);
    }
    /** Use a transaction to perform a series of queries. */
    public abstract withTransaction<T>(outer: () => api.Transaction, cb: TransactionCallback<T>, writeAccess: boolean): Promise<T>;
    /** Optional close implementation. */
    public async close(): Promise<void> {
    }
}

/**
 *  An iterator to allow iteration over the results with
 *
 *  ```
 *  for await (const x ...) {...}
 *  ```.
 */
export interface ResultIterableIterator extends AsyncIterableIterator<api.Record> {
    /**
     * At the conclusion of the iteration, we can obtain the result summary.
     */
    getSummary(): ResultSummary;
}

/**
 * An abstract transaction, within which we can perform multiple queries.
 */
export interface Transaction extends Parent, Marker {
    /** Perform a query and obtain the collected results all at once. */
    query(query: api.Query, params: object): Promise<api.CollectedResults>;
    /** Perform a query, and obtain the results as a stream. */
    queryStream(query: api.Query, params: object): Promise<RecordStream>;
    /** Perform a query, and obtain the results via async iteration. */
    queryIterator(query: api.Query, params: object): Promise<ResultIterator>;

    /**
     * Called if the transaction completes successfully (i.e. no error was thrown). This only needs
     * a non-empty implementation if the database's handling of transactions doesn't do this behind
     * the scenes.
     */
    commit(): Promise<void>;

    /**
     * Called if the transaction fails (i.e. an error was thrown). This only needs
     * a non-empty implementation if the database's handling of transactions doesn't do this behind
     * the scenes.
     */
    rollback(e: Error): Promise<void>;
}

export abstract class TransactionImpl<I> extends Base<api.Transaction, Session, I> {
    protected constructor(impl: (otter: api.Transaction) => I,
                          outer: Future<api.Transaction>,
                          parent: Session) {
        super(impl, outer, parent);
    }
    /** Perform a query and obtain the collected results all at once. */
    public abstract query(query: api.Query, params: object): Promise<api.CollectedResults>;
    /** Perform a query, and obtain the results as a stream. */
    public abstract queryStream(query: api.Query, params: object): Promise<RecordStream>;
    /** Perform a query, and obtain the results via async iteration. */
    public abstract queryIterator(query: api.Query, params: object): Promise<ResultIterator>;

    /**
     * Called if the transaction completes successfully (i.e. no error was thrown). This only needs
     * a non-empty implementation if the database's handling of transactions doesn't do this behind
     * the scenes.
     */
    public async commit(): Promise<void> {
    }

    /**
     * Called if the transaction fails (i.e. an error was thrown). This only needs
     * a non-empty implementation if the database's handling of transactions doesn't do this behind
     * the scenes.
     */
    public async rollback(e: Error): Promise<void> {
    }
}

/**
 * An abstract query
 */
export interface Query extends api.Query {
    parameters: api.QueryParameters;
    statement: api.Query | string;
}

/**
 * Helpful, possibly implementation-dependent information from a query.
 */
export class ResultSummary implements api.ResultSummary {
    /**
     * The elapsed time to execute the query.
     */
    public elapsedTime: seconds;
    /**
     * The number of items read. Zero if none, e.g. a statement
     */
    public readCount: number;
    /**
     * The number of items created.
     */
    public createCount: number;
    /**
     * The number of items modified.
     */
    public modifiedCount: number;
    /**
     * On unsuccessful queries, an error.
     */
    public error?: Error;
}

/**
 * This is what to implement to provide access to the composite results of running a [[Query]].
 * It provides access to the rows
 * or unit of possibly-repeated information.
 */
export abstract class CollectedResults implements api.CollectedResults {
    /**
     * Get an array of results from the summary.
     */
    public abstract getResults(): api.Record[];
    public abstract getResultSummary(): Promise<ResultSummary>;
}

/**
 * An object-mode stream that provides a series of Record values. Once the results have been read, a
 * ResultSummary can be obtained with helpful, possibly implementation-dependent information, through
 * listening for the ```"result"``` event.
 */
export abstract class RecordStream extends Readable implements api.RecordStream {
    private readonly summary: Promise<ResultSummary>;
    protected constructor() {
        super();
        this.summary = new Promise<ResultSummary>((success, failure) => {
            this
                .on('result', summary => success(summary))
                .on('error', e => failure(e));
        });
    }

    public getResultSummary() {
        return this.summary;
    }
}

export abstract class ResultIterator implements  api.ResultIterator {
    public abstract [Symbol.asyncIterator](): AsyncIterableIterator<Record>;

    public abstract async next(value?: any): Promise<IteratorResult<Record>>;

    public abstract getResultSummary(): Promise<ResultSummary>;
}

export type ProviderFactory = (parent: DatabaseAccess, params: ConnectionParameters) => Provider;

const PROVIDERS: {[key: string]: ProviderFactory} = {};

export function registerProviderFactory(key: string, provider: ProviderFactory): void {
    PROVIDERS[key] = provider;
}

export function getProviderFactory(key: string) {
    return PROVIDERS[key];
}
