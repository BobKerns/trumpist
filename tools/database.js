/*
 * Copyright (c) 2018 Bob Kerns.
 */

/**
 * @module DatabaseAccess
 */

'use strict';

const defaultLog = require('./logging')('database');
const Query = require('./query');
const Neo4JConnector_3_4 = require('./neo4j-connector');

/**
 * Abstracted factory access to the database, allowing substitution (e.g. mocking) and enforcing consistent
 * usage patterns (e.g. proper closing, error checking, etc.)
 *
 * Instantiating this is for configuration only. No external work is done until {@link DatabaseAccess#withDatabase} is
 * called (at the earliest).
 * @implements Connector
 */
class DatabaseAccess {
    /**
     * Create a Database Access object
     * @param options options for the underlying database driver
     * @param {string} options.database Type of database. Currently must be "neo4j" or "neo4j@3.4"
     * @param {Logger} options.log object, supporting debug, trace, and error methods.
     * @param {string} options.uri Typical connection parameters, for underlying database driver.
     * @param {string} options.user Typical connection parameters, for underlying database driver.
     * @param {string} options.password Typical connection parameters, for underlying database driver
     */
    constructor(options) {
        let {database, log} = options;
        this.log = log || defaultLog;
        this.database = database;
        switch (database) {
            case "neo4j":
            case "neo4j@3.4":
                /** @type Connector */
                this.connector = new Neo4JConnector_3_4(this, options);
                break;
            default:
                throw new Error(`The database ${database} is not supported.`);
        }
    }

    /**
     * Access the database, ensuring cleanup.
     * @param {Connector~driverCallback} fn Callback that performs work with access to this database.
     * @returns {Promise<*>} Returns a Promise with the value of _fn_, or reflecting any error thrown.
     */
    async withDatabase(fn) {
        let inner;
        let log = this.log;
        try {
            log.debug(`Using database ${this.database}.`);
            let val = await this.connector.withDatabase(driver => fn((inner = new Driver(driver, this))));
            log.debug(`Finished with database ${this.database}.`);
            return val;
        } catch (e) {
            log.debug(`Error using database ${this.database}: ${e.message}\n${e.stack}`);
            throw e;
        } finally {
            if (inner) {
                await this.connector.close();
            }
        }
    }
}

/**
 * @interface Connector
 */

/**
 * Callback to do work with one database.
 *
 * @async
 * @callback Connector~driverCallback
 * @param {Driver} driver A factory for sessions (aka connections).
 * @returns Promise
 */

/**
 * @method
 * @async
 * @name Connector#withDatabase
 * @param {Connector~driverCallback} fn
 * @returns Promise
 */

/**
 * @async
 * @callback Driver~sessionCallback
 * @param {Session} session The session (aka) connection. Not thread/async safe.
 * @returns Promise
 */

let COUNT = 0;

/**
 * A Driver wrapper for the underlying driver implementation that serves as a factory for connections.
 * @public
 */
class Driver {
    // Internal
    constructor(driver, parent) {
        this.driver = driver;
        this.log = parent.log;
        this.id = COUNT++;
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Connect to the database and prepare to begin issuing transactions.
     *
     * @param {Driver~sessionCallback} fn The function that executes with this session
     * @param {boolean} writeAccess true if write access is needed.
     * @returns {Promise<*>} the return value from the session
     * @public
     */
    async withSession(fn, writeAccess=false) {
        let id = COUNT++;
        let dir = writeAccess ? 'WRITE' : 'READ';
        let wrapped = async session => {
            // noinspection SpellCheckingInspection
            let nsession = new Session(session, this);
            try {
                // noinspection SpellCheckingInspection
                this.log.trace(`SESBEG: ${id} ${dir} Session begin`);
                let val = await fn(nsession);
                // noinspection SpellCheckingInspection
                this.log.trace(`SESEND: ${id} ${dir} Session returns ${val}`);
                return val;
            } catch (e) {
                // noinspection SpellCheckingInspection
                this.log.error(`SESER: ${id} ${dir} Session failed: ${e.message}\n${e.stack}`);
            } finally {
                await nsession.close();
            }
        };
        return await this.driver.withSession(wrapped, writeAccess);
    }

    /**
     * Close the database and any open connections.
     * @returns {Promise<*>}
     */
    async close() {
        return this.driver.close();
    }
}

/**
 * @callback Session~transactionCallback
 * @param {Transaction} transaction The transaction in which operations should be performed.
 */

/**
 * Session object exposed to the application code. Factory for transactions.
 * @public
 */
class Session {
    constructor(session, parent) {
        this.session = session;
        this.log = parent.log;
        this.id = COUNT++;
    }

    /**
     * Execute a transaction. It will be committed on successful completion, or rolled back on error.
     *
     * @param {Session~transactionCallback} fn
     * @param {boolean} writeAccess
     * @returns {Promise<*>} The return value from the transaction.
     */
    async withTransaction(fn, writeAccess=false) {
        let id = COUNT++;
        let log = this.log;
        let name = fn.name || 'anon';
        let inner = async tx => {
            let transaction = new Transaction(tx, writeAccess);
            let dir = writeAccess ? 'WRITE' : 'READ';
            try {
                // noinspection SpellCheckingInspection
                log.trace(`TXFBEG: ${name} ${id} ${dir} transaction function begin`);
                let val = await fn(transaction);
                // noinspection SpellCheckingInspection
                log.trace(`TXFEND: ${name} ${id} ${dir} transaction function returned ${val}`);
                if (writeAccess) {
                    await transaction.commit();
                }
                return val;
            } catch (e) {
                // noinspection SpellCheckingInspection
                log.error(`TXFEND: ${name} ${dir} transaction failed: ${e.message}\n${e.stack}`);
                if (writeAccess) {
                    await transaction.rollback();
                }
                throw e;
            }
        };
        try {
            // noinspection SpellCheckingInspection
            log.debug(`TXBEG: ${name} ${id} READ transaction begin`);
            let val = await this.session.withTransaction(inner, writeAccess);
            // noinspection SpellCheckingInspection
            log.trace(`TXEND: ${name} ${id} READ transaction returned ${val}`);
            return val;
        } catch (e) {
            this.log.error(`END: ${name} READ transaction failed: ${e.message}\n${e.stack}`);
        }
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Execute a read-only transaction.
     * @param {Session~transactionCallback} fn
     * @returns {Promise<*>} The return value from the transaction.
     * @public
     */
    async withReadTransaction(fn) {
        return this.withTransaction(fn, false);
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Execute a transaction that can modify data.
     *
     * @param {Session~transactionCallback} fn
     * @returns {Promise<*>} The return value from the transaction.
     * @public
     */
    async withWriteTransaction(fn) {
        return this.withTransaction(fn, true);
    }

    /**
     * Close th session, freeing any resources
     * @returns {Promise<*>}
     */
    async close() {
        return this.session.close();
    }
}

/**
 * The transaction object presented to application code
 */
class Transaction {
    constructor(transaction, parent, writeAccess=false) {
        this.transaction = transaction;
        this.log = parent.log;
        this.write = writeAccess;
        this.id = COUNT++;
    }

    /**
     * Execute a query.
     * @param {Query} query
     * @param {Object} params
     * @returns {Promise<*>}
     */
    async run(query, params) {
        let name = `${query.name}:${this.id}:${COUNT++}`;
        let log = this.log;
        try {
            // noinspection SpellCheckingInspection
            log.debug(`TXRUN: ${name} GO`);
            let val = this.transaction.run(query, params);
            // noinspection SpellCheckingInspection
            log.debug(`TXRUN: ${name} OK`);
            return val;
        } catch (e) {
            // noinspection SpellCheckingInspection
            log.error(`TXRUN: ${name} FAIL: ${e.message}\n${e.stack}`);
            throw e;
        }
    }

    // noinspection JSMethodCanBeStatic
    /**
     * NOOP, since Neo4J integrates commit/rollback into withTransaction
     * @see Transaction#rollback
     * @returns {Promise<*>}
     */
    async rollback() {
        return null;
    }

    // noinspection JSMethodCanBeStatic
    /**
     * NOOP, since Neo4J integrates commit/rollback into withTransaction
     * @see Transaction#rollback
     * @returns {Promise<null>}
     */
    async commit() {
        return null;
    }
}

module.export = DatabaseAccess;
DatabaseAccess.impl = {Driver, Session, Transaction, Query};