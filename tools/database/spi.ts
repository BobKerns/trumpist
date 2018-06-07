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
    readonly impl: I;
    readonly parent: P
    readonly log: Logger;
    readonly database: string;
    readonly id: string;

    constructor(impl: () => I, parent?: P, parentDb?: string) {
        this.impl = impl();
        this.log = this.parent && parent!.log;
        this.database = this.parent && parent!.database || parentDb || "DB";
        this.id = `${(this.parent && parent!.id) || parentDb}/${nextId()}`
    }
}


/**  Callback for receiving a [[Database]] at the internal SPI level. */
export type DatabaseCallback<T,I> = (db: Database<I>) => Maybe<T>;
/**  Callback for receiving a [[Session]] at the internal SPI level. */
export type SessionCallback<T,I> = (session: Session<I>) => Maybe<T>;
/**  Callback for receiving a [[Transaction]] at the internal SPI level. */
export type TransactionCallback<T,I> = (tx: Transaction<I>) => Maybe<T>;

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
    abstract withDatabase<T,I>(cb: DatabaseCallback<T,I>) : Promise<T>;

    /**
     * Override this with any needed cleanup
     */
    async close(): Promise<void> {
    }
}

/**
 * This repesents a particularized access, e.g. a configured driver ready to
 * provide sessions/connections. Shared between "threads" of execution.
 */
export abstract class Database<I> extends Base<Provider, I>  {
    constructor(impl: () => I, parent: Provider) {
        super(impl, parent);
    }
    /** Obtain a session to begin a series of transactions. */
    abstract withSession<T, I>(cb: SessionCallback<T, I>, writeAccess: boolean): Promise<T>;

    async close(): Promise<void> {
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
    abstract withTransaction<T>(cb: TransactionCallback<T, any>, writeAccess: boolean): Promise<T>;
    /** Optional close implementation. */
    async close(): Promise<void> {
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
    abstract query(query: api.Query, params: object): Promise<api.CollectedResults>;
    /** Perform a query, and obtain the results as a stream. */
    abstract queryStream(query: api.Query, params: object): Promise<RecordStream>;
    /** Perform a query, and obtain the results via async iteration. */
    abstract queryIterator(query: api.Query, params: object): Promise<ResultIterator>;

    /**
     * Called if the transaction completes successfully (i.e. no error was thrown). This only needs
     * a non-empty implementation if the database's handling of transactions doesn't do this behind
     * the scenes.
     */
    async commit(): Promise<void> {

    }

    /**
     * Called if the transaction fails (i.e. an error was thrown). This only needs
     * a non-empty implementation if the database's handling of transactions doesn't do this behind
     * the scenes.
     */
    async rollback(e: Error): Promise<void> {
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
    elapsedTime: seconds;
    /**
     * The number of items read. Zero if none, e.g. a statement
     */
    readCount: number;
    /**
     * The number of items created.
     */
    createCount: number;
    /**
     * The number of items modified.
     */
    modifiedCount: number;
    /**
     * On unsuccessful queries, an error.
     */
    error?: Error;
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
    abstract getResults(): api.Record[];
    abstract getResultSummary(): Promise<ResultSummary>;
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

    getResultSummary() {
        return this.summary;
    }
}

export abstract class ResultIterator implements  api.ResultIterator {
    abstract [Symbol.asyncIterator](): AsyncIterableIterator<Record>;

    abstract async next(value?: any): Promise<IteratorResult<Record>>;

    abstract getResultSummary(): Promise<ResultSummary>;
}
