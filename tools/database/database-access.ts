/*
 * Copyright (c) 2018 Bob Kerns.
 */

'use strict';

import {create as createLog, Logger} from "../util/logging";
const defaultLog = createLog('database');
import * as spi from "./spi";
import * as api from "./api";
import {Neo4JConnector, Neo4JConnector_3_4} from "./neo4j-connector";
import {SessionCallback} from "./spi";
import {CollectedResults, RecordStream, ResultIterator, Query, nextId} from "./api";

export interface DbOptions {
    /** The type of the database. Currently must be "neo4j" or "neo4j@3.4" */
    database: string,
    /** The parameters to the underlying database. */
    parameters?: spi.ConnectionParameters,
    /** Logger to log to. */
    log?: Logger;
    /** An optional identifier to denote this source. Defaults to database. */
    id?: string;
}



class Base<P extends (api.Parent & api.Marker) | undefined, S extends spi.Marker> {
    protected spiObject: S;
    readonly parent: P
    readonly log: Logger;
    readonly database: string;
    readonly id: string;

    constructor(spiObject: () => S, parent: P, parentDb?: string) {
        this.spiObject = spiObject();
        this.log = this.parent && parent!.log || defaultLog;
        this.database = this.parent && parent!.database || parentDb || "DB";
        this.id = `${(this.parent && parent!.id) || parentDb}/${nextId()}`
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
    /**
     * Create a Database Access object.
     */
    constructor(options: DbOptions) {
        let {database, log} = options;
        let params: spi.ConnectionParameters = ((options.parameters || {database, log}) as spi.ConnectionParameters);
        switch (database) {
            case "neo4j": {
                let provider = () => new Neo4JConnector(this, params);
                super(provider, undefined, database);
                break;
            }
            case "neo4j@3.4": {
                let provider = () => new Neo4JConnector_3_4(this, params);
                super(provider, undefined, database);
                break;
            }
            default:
                throw new Error(`The database ${database} is not supported.`);
        }
    }

    /**
     * Access the database, ensuring cleanup.
     * @param fn Callback that performs work with access to this database.
     * @returns a ```Promise``` with the value of ```fn```, or reflecting any error thrown.
     */
    async withDatabase<T>(fn: api.DatabaseCallback<T>): Promise<T> {
        let log = this.log;
        try {
            log.debug(`Using database ${this.database}.`);
            let val = await this.spiObject.withDatabase(driver => fn(new Database(driver, this)));
            log.debug(`Finished with database ${this.database}.`);
            return val;
        } catch (e) {
            log.debug(`Error using database ${this.database}: ${e.message}\n${e.stack}`);
            throw e;
        }
    }
}

/**
 * A Driver wrapper for the underlying driver implementation that serves as a factory for connections.
 */
class Database extends Base<DatabaseAccess, spi.Database<any>> implements api.Database {
    // Internal
    constructor(driver: spi.Database<any>, parent: DatabaseAccess) {
        super(() => driver, parent);
    }

    /**
     * Connect to the database and prepare to begin issuing transactions.
     *
     * @param cb The function that executes with this session
     * @param writeAccess true if write access is needed.
     * @returns the return value from the session
     */
    async withSession<T>(cb : api.SessionCallback<T>, writeAccess:boolean = false): Promise<T> {
        let id = nextId();
        let dir = writeAccess ? 'WRITE' : 'READ';
        let wrapped: SessionCallback<T,any> = async (session : spi.Session<any>) => {
            let nsession = new Session(session, this);
            try {
                this.log.trace(`SESBEG: ${id} ${dir} Session begin`);
                let val = await cb(nsession);
                this.log.trace(`SESEND: ${id} ${dir} Session returns ${val}`);
                return val;
            } catch (e) {
                this.log.error(`SESER: ${id} ${dir} Session failed: ${e.message}\n${e.stack}`);
                throw e;
            } finally {
                await nsession.close();
            }
        };
        return await this.spiObject.withSession(wrapped, writeAccess);
    }

    /**
     * Close the database and any open connections.
     */
    async close() {
        return this.spiObject.close();
    }
}

/**
 * Session object exposed to the application code. Factory for transactions.
 */
class Session extends Base<Database, spi.Session<any>> implements api.Session {
    constructor(session: spi.Session<any>, parent: Database) {
        super(() => session, parent);
    }

    /**
     * Execute a transaction. It will be committed on successful completion, or rolled back on error.
     */
    async withTransaction<T>(fn: api.TransactionCallback<T>, writeAccess=false) {
        let id = nextId();
        let log = this.log;
        let name = fn.name || 'anon';
        let inner: spi.TransactionCallback<T, any> = async tx => {
            let transaction = new Transaction(tx, this, writeAccess);
            let dir = writeAccess ? 'WRITE' : 'READ';
            try {
                // noinspection SpellCheckingInspection
                log.trace(`TXFBEG: ${name} ${id} ${dir} transaction function begin`);
                let val = await fn(transaction);
                // noinspection SpellCheckingInspection
                log.trace(`TXFEND: ${name} ${id} ${dir} transaction function returned ${val}`);
                if (writeAccess) {
                    await tx.commit();
                }
                return val;
            } catch (e) {
                // noinspection SpellCheckingInspection
                log.error(`TXFEND: ${name} ${dir} transaction failed: ${e.message}\n${e.stack}`);
                if (writeAccess) {
                    await tx.rollback(e);
                }
                throw e;
            }
        };
        try {
            // noinspection SpellCheckingInspection
            log.debug(`TXBEG: ${name} ${id} READ transaction begin`);
            let val = await this.spiObject.withTransaction(inner, writeAccess);
            // noinspection SpellCheckingInspection
            log.trace(`TXEND: ${name} ${id} READ transaction returned ${val}`);
            return val;
        } catch (e) {
            this.log.error(`END: ${name} READ transaction failed: ${e.message}\n${e.stack}`);
            throw e;
        }
    }



    /**
     * Execute a read-only transaction.
     * @param fn
     * @returns The return value from the transaction.
     */
    async withReadTransaction<T>(fn: api.TransactionCallback<T>) : Promise<T> {
        return this.withTransaction(fn, false);
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Execute a transaction that can modify data.
     *
     * @param fn
     */
    async withWriteTransaction<T>(fn: api.TransactionCallback<T>) : Promise<T> {
        return this.withTransaction(fn, true);
    }

    /**
     * Close the session, freeing any resources
     */
    async close(): Promise<void> {
        return this.spiObject.close();
    }
}

/**
 * The transaction object presented to application code
 */
class Transaction extends Base<Session, spi.Transaction<any>> implements  api.Transaction {
    readonly writeAccess: boolean;
    constructor(transaction: spi.Transaction<any>, parent: Session, writeAccess=false) {
        super(() => transaction, parent);
        this.writeAccess = writeAccess;
    }

    /**
     * Execute a query.
     * @param query The query to execute. It must be fully resolvable with the supplied params
     * @param params Parameters to flesh out the query.
     */
    async run<T>(query: api.Query, params: api.QueryParameters, fn: (q: api.Query, p: api.QueryParameters) => T) {
        let name = `${query.name || 'anon'}:${this.id}:${nextId()}`;
        let log = this.log;
        try {
            log.debug(`TXRUN: ${name} GO`);
            let val = fn(query, params);
            this.commit();
            log.debug(`TXRUN: ${name} OK`);
            return val;
        } catch (e) {
            log.error(`TXRUN: ${name} FAIL: ${e.message}\n${e.stack}`);
            this.rollback(e);
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
    async query(query: Query, params: object): Promise<CollectedResults> {
        return this.run(query, params, () => this.spiObject.query(query, params));
    }

    /** Perform a query, and obtain the results as a stream. */
    async queryStream(query: Query, params: object): Promise<RecordStream> {
        return this.run(query, params, () => this.spiObject.queryStream(query, params));
    }
    /** Perform a query, and obtain the results via async iteration. */
    async queryIterator(query: Query, params: object): Promise<ResultIterator> {
        return this.run(query, params, () => this.spiObject.queryIterator(query, params));
    }
}