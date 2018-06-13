/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {Readable} from "stream";
import {Logger} from "../util/logging";
import {AnyParams, Nullable} from "../util/types";

export type Maybe<T> = T | Promise<T>;

/**  Callback for receiving a [[Database]] at the API level. */
export type DatabaseCallback<T> = (db: Database) => Maybe<T>;
/**  Callback for receiving a [[Session]] at the API level. */
export type SessionCallback<T> = (session: Session) => Maybe<T>;
/**  Callback for receiving a [[Transaction]] at the API level. */
export type TransactionCallback<T> = (tx: Transaction) => Maybe<T>;

/**
 * A time interval in seconds.
 */
export type seconds = number;

/*
 A marker for api vs spi classes. Helps to prevent passing the wrong one in a generic type.
  */
export interface Marker {
}

export interface Parent {
    readonly log: Logger;
    readonly database: string;
    readonly id: string;
}

/**
 * A session or transaction can be in read or write mode. Specifying them correctly isn't just a matter of safety;
 * a read-mode request can be routed to a read-only replica.
 */
export enum Mode {
    READ,
    WRITE
}

/**
 * This represents a particularized access, e.g. a configured driver ready to
 * provide sessions/connections. Shared between "threads" of execution.
 */
export interface Database extends Marker, Parent {
    /** Obtain a session to begin a series of transactions. */
    withSession<T>(mode: Mode, cb: SessionCallback<T>): Promise<T>;
}

/**
 * One interaction with the database. Must be used as "single-threaded" and not
 * be interleaved.
 */
export interface Session extends Marker, Parent {
    readonly mode: Mode;
    /** Use a transaction to perform a series of queries. */
    withTransaction<T>(mode: Mode, cb: TransactionCallback<T>): Promise<T>;
}

/**
 *  An iterator to allow iteration over the results with
 *
 *  ```
 *  for await (const x ...) {...}
 *  ```.
 */
export interface RecordIterableIterator extends AsyncIterableIterator<Record> {
    // At the conclusion of the iteration, we can obtain the result summary.
    getSummary(): ResultSummary;
}
/**
 * An abstract transaction, within which we can perform multiple queries.
 */
export interface Transaction extends Marker, Parent {
    readonly mode: Mode;
    /** Perform a query and obtain the collected results all at once. */
    query(query: Query, params: object): Promise<CollectedResults>;
    /** Perform a query, and obtain the results as a stream. */
    queryStream(query: Query, params: object): Promise<RecordStream>;
    /** Perform a query, and obtain the results via async iteration. */
    queryIterator(query: Query, params: object): Promise<ResultIterator>;
}

/**
 * Return result after expansion.
 */
export interface ExpandResult {
    /** Optional name for this query. */
    name?: string;
    /** The expanded result. */
    statement: string;
    /** Unused supplied parameter values, to be supplied for substitution in running the query. */
    parameters: AnyParams;
    /** Parameters not supplied, but used in the template */
    missing: string[];
    /** Parameters supplied but not used, for error reporting */
    unused: string[];
}

/**
 * An abstract query
 */
export interface Query {
    name?: string;
    /**
     * Return a detailed response partially-curried statement, and lists of used and unused parameters.
     */
    expand(params: object): ExpandResult;

    curry(name: Nullable<string>, params: AnyParams): Query;
}

/**
 * Helpful, possibly implementation-dependent information from a query.
 */
export interface ResultSummary {
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
 * The various ways to access result, provide additional information in a [[ResultSummary]] when complete.
 * As it returns a `Promise`, it can be requested at any time.
 */
interface ResultSummaryProvider {
    getResultSummary(): Promise<ResultSummary>;
}

/**
 * This is what to implement to provide access to the composite results of running a [[Query]].
 * It provides access to the rows
 * or unit of possibly-repeated information.
 */
export interface CollectedResults extends ResultSummaryProvider {
    /**
     * Get an array of results from the summary.
     */
    getResults(): Record[];
}

/**
 * This is what to implement to provide access to a result of running a [[Query]]. It provides access to one "row"
 * or unit of information; one query may result in zero or more [[Record]] being returned.
 */
export interface Record {
    /**
     * Return one value from the result.
     * @param key
     */
    get(key: string): any;
}

/**
 * An object-mode stream that provides a series of Record values. Once the results have been read, a
 * ResultSummary can be obtained with helpful, possibly implementation-dependent information, through
 * listening for the `"result"` event.
 */
export interface RecordStream extends Readable, ResultSummaryProvider {

}

export interface ResultIterator extends AsyncIterableIterator<Record>, ResultSummaryProvider {
}

/**
 * Parameters supplied to [[Provider]] constructors.
 * `database` is provided to allow referencing it in error messages.
 * `log` is the standard logger supplied by the framework.
 */
export interface ConnectionParameters {
    /** The name of the database type requested. */
    database: string;
    /** The logger to use for any logging. */
    log: Logger;
    /** Implementation-dependent keys are allowed. */
    [key: string]: any;
}

let ID_COUNTER: number = 0;

export function nextId() {
    return ID_COUNTER++;
}
