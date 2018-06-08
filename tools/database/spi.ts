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

// A marker for api vs spi classes
export interface Marker {

}

export abstract class Base<P extends Parent & Marker, I> {
    public readonly log: Logger;
    public readonly database: string;
    public readonly id: string;
    protected readonly impl: I;
    protected readonly parent: P;

    constructor(impl: () => I, parent?: P, parentDb?: string) {
        this.impl = impl();
        this.log = this.parent && parent!.log;
        this.database = this.parent && parent!.database || parentDb || "DB";
        this.id = `${(this.parent && parent!.id) || parentDb}/${nextId()}`;
    }
}


/**  Callback for receiving a [[Database]] at the internal SPI level. */
export type DatabaseCallback<T, I> = (db: Database<I>) => Maybe<T>;
/**  Callback for receiving a [[Session]] at the internal SPI level. */
export type SessionCallback<T, I> = (session: Session<I>) => Maybe<T>;
/**  Callback for receiving a [[Transaction]] at the internal SPI level. */
export type TransactionCallback<T, I> = (tx: Transaction<I>) => Maybe<T>;

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

export abstract class Provider extends Base<DatabaseAccess, ConnectionParameters> {
    constructor(parent: DatabaseAccess, parameters: ConnectionParameters) {
        super(() => parameters, parent);
    }

    /** Access a database, disposing of any resources when done. */
    public abstract withDatabase<T, I>(cb: DatabaseCallback<T, I>): Promise<T>;

    /**
     * Override this with any needed cleanup
     */
    public async close(): Promise<void> {
    }
}

/**
 * This represents a particularized access, e.g. a configured driver ready to
 * provide sessions/connections. Shared between "threads" of execution.
 */
export abstract class Database<I> extends Base<Provider, I>  {
    constructor(impl: () => I, parent: Provider) {
        super(impl, parent);
    }
    /** Obtain a session to begin a series of transactions. */
    public abstract withSession<T, S>(cb: SessionCallback<T, S>, writeAccess: boolean): Promise<T>;

    public async close(): Promise<void> {
    }
}

/**
 * One interaction with the database. Must be used as "single-threaded" and not
 * be interleaved.
 */
export abstract class Session<I> extends Base<Database<any>, I> {
    constructor(impl: () => I, parent: Database<any>) {
        super(impl, parent);
    }
    /** Use a transaction to perform a series of queries. */
    public abstract withTransaction<T>(cb: TransactionCallback<T, any>, writeAccess: boolean): Promise<T>;
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
export abstract class Transaction<I> extends Base<Session<any>, I> {

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
    private summary: Promise<ResultSummary>;
    constructor() {
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
