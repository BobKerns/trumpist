/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {Readable} from "stream";
import {Logger} from "../util/logging";

import * as api from "./api";
import {ConnectionParameters, Maybe, Parent, Record, seconds} from "./api";
import DatabaseAccess from "./database-access";
import {captureValue, Future} from "../util/future";
import advanceTimersByTime = jest.advanceTimersByTime;

export {seconds, Maybe, ConnectionParameters} from "./api";
export {Logger} from "../util/logging";

// A marker for api vs spi classes
export interface Marker {

}

export type PMarker = Marker & Parent;

type BaseFutureKeys = "log" | "database" | "id" | "outer";

type Wrapper<O, T> = (outer: O) => Maybe<T>;
type Wrapped<I, T> = (i: (i: I) => Promise<T>) => Promise<T>;

interface SpiParent<A extends api.PMarker, S extends PMarker, X> {

    /**
     * Instantiate the appropriate SPI implementation class to wrap this implementation object.
     * @param <X> impl
     * @returns <S> the appropriate DB-specific SPI wrapper.
     */
    newSPI(mode: api.Mode, outer: () => A, impl: X): S;

    /**
     * This method should be implemented by the SPI class to create the implementation object. Once it is created and
     * valid for use, it should call the callback, returning the value from the callback.
     *
     * The callback is responsible for calling {@link Base.newSPI} to allocate the SPI wrapper, and supplying it to the
     * API callback.
     *
     * All async operations should be awaited. When the callback is done, any resources should be finalized.
     * @param {(impl: X) => Promise<T>} cb
     * @returns {Promise<T>}
     */
    invoke<T>(mode: api.Mode, cb: (impl: X) => Promise<T>): Promise<T>;
}

export abstract class Base<O extends api.Marker & api.Parent, P extends PMarker, I> {
    private readonly _outer: Future<O>;
    get log() {
        const parent = this.outer.log.parent || this.outer.log;
        return parent.getChild(this.database);
    }
    get database() { return this.outer.database; }
    get id() { return `[${this.outer.id}]`; }
    get outer() { return this._outer.value; }

    protected readonly impl: I;
    protected readonly parent?: P;

    protected constructor(impl: I, outer: Future<O>, parent: P, parentDb?: string) {
        this._outer = outer;
        this.impl = impl;
        this.parent = parent;
    }
}

export abstract class BaseWithSpi<O extends api.Marker & api.Parent, P extends PMarker, I,
    A extends api.PMarker = api.PMarker, S extends PMarker = PMarker, X = any>
    extends Base<O, P, I>
    implements SpiParent<A, S, X> {

    public abstract invoke<T>(mode: api.Mode, cb: (impl: X) => Promise<T>): Promise<T>;

    public abstract newSPI(mode: api.Mode, outer: () => api.PMarker, impl: any): S;


    /**
     *
     * @param {(impl: X) => S} spiFn       Creates SPI-level object, implemented by {@link Base.newSPI}
     * @param {C} cb
     * @returns {(impl: X) => Promise<T>}
     */
    protected callbackWrapper<T>(
        spiFn: (impl: X) => S,
        cb: Wrapper<S, T>): (impl: X) => Promise<T> {
        return async (impl: X): Promise<T> => Promise.resolve(cb(spiFn(impl)));
    }

    protected async invokeInner<C, T>(
        key: string, description: string, mode: api.Mode, apiObjFn: () => A, fn: Wrapper<S, T>) {

        const log = this.log;
        try {
            log.trace(`${key}BEGX beginning ${description}.`);
            const newSPI = (impl: X) => this.newSPI(mode, apiObjFn, impl);
            const exfn: Wrapped<X, T> =
                (cb): Promise<T> => this.invoke<T>(mode, cb);
            const val: T = await exfn(this.callbackWrapper<T>(newSPI, fn));
            log.trace(`${key}ENDX ${description} returns ${val}`);
            return val;
        } catch (e) {
            log.trace(`${key}ERRX ${description} throws ${e.message}`, e);
            throw e;
        }
    }
}


export type SPICallback<S, T> = (spiObj: S) => Maybe<T>;

/**  Callback for receiving a [[Database]] at the internal SPI level. */
export type DatabaseCallback<T> = SPICallback<Database, T>;
/**  Callback for receiving a [[Session]] at the internal SPI level. */
export type SessionCallback<T> = SPICallback<Session, T>;
/**  Callback for receiving a [[Transaction]] at the internal SPI level. */
export type TransactionCallback<T> = SPICallback<Transaction, T>;

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

export interface Provider extends PMarker {
    /** Access a database, disposing of any resources when done. */
    withDatabase<T>(outer: () => api.Database, cb: DatabaseCallback<T>): Promise<T>;

    /**
     * Override this with any needed cleanup
     */
    close(): Promise<void>;
}

/**
 * Base class for a provider implementation.
 * @param <S> The type of the SPI class to be created
 */
export abstract class ProviderImpl<X>
    extends BaseWithSpi<DatabaseAccess, DatabaseAccess, ConnectionParameters, api.Database, Database, X>
    implements PMarker {
    protected constructor(outer: Future<DatabaseAccess>, parent: DatabaseAccess, parameters: ConnectionParameters) {
        super(parameters, outer, parent);
    }

    /** Access a database, disposing of any resources when done. */
    public withDatabase<T>(outer: () => api.Database, fn: DatabaseCallback<T>): Promise<T> {
        return this.invokeInner(
            'DRV', 'DB Driver', api.Mode.WRITE, outer, fn);
    }

    /**
     * Override this with any needed cleanup
     */
    public async close(): Promise<void> {
    }
}

export interface Database extends PMarker {
    /** Obtain a session to begin a series of transactions. */
    withSession<T>(mode: api.Mode, outer: () => api.Session, cb: SessionCallback<T>): Promise<T>;

    close(): Promise<void>;
}

/**
 * This represents a particularized access, e.g. a configured driver ready to
 * provide sessions/connections. Shared between "threads" of execution.
 */
export abstract class DatabaseImpl<I, X>
    extends BaseWithSpi<api.Database, Provider, I, api.Session, Session, X>
    implements Database {
    protected constructor(impl: I, outer: Future<api.Database>, parent: Provider) {
        super(impl, outer, parent);
    }
    /** Obtain a session to begin a series of transactions. */
    public withSession<T>(mode: api.Mode, outer: () => api.Session, cb: SessionCallback<T>): Promise<T> {
        return this.invokeInner(
            'SES', 'DB Session', mode, outer, cb);
    }

    public async close(): Promise<void> {
    }
}

export interface Session extends PMarker {
    /** Use a transaction to perform a series of queries. */
    withTransaction<T>(mode: api.Mode, outer: () => api.Transaction, cb: TransactionCallback<T>): Promise<T>;
    /** Optional close implementation. */
    close(): Promise<void>;
}
/**
 * One interaction with the database. Must be used as "single-threaded" and not
 * be interleaved.
 */
export abstract class SessionImpl<I, X>
    extends BaseWithSpi<api.Session, Database, I,
        api.Transaction, Transaction, X>
    implements Session {
    protected constructor(impl: I,
                          outer: Future<api.Session>,
                          parent: Database) {
        super(impl, outer, parent);
    }
    /** Use a transaction to perform a series of queries. */
    public withTransaction<T>(mode: api.Mode,
                              outer: () => api.Transaction,
                              cb: TransactionCallback<T>): Promise<T> {
        return this.invokeInner(
            'TX.', 'DB Transaction', mode, outer, cb);
    }
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
export interface Transaction extends PMarker {
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
    protected constructor(impl: I,
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
    public abstract getResults(): Promise<api.Record[]>;
    public abstract getResultSummary(): Promise<ResultSummary>;
}

/**
 * An object-mode stream that provides a series of Record values. Once the results have been read, a
 * ResultSummary can be obtained with helpful, possibly implementation-dependent information, through
 * listening for the ```"result"``` event.
 */
export abstract class RecordStream extends Readable implements api.RecordStream {
    protected readonly summary: Promise<ResultSummary>;
    protected constructor() {
        super({objectMode: true});
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
