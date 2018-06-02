/*
 * Copyright (c) 2018 Bob Kerns.
 */

/**
 * @module dbaccess
 */

'use strict';

const defaultLog = require('../logging')('database');
const Query = require('./query');
const Neo4JConnector_3_4 = require('./neo4j-connector');

/**
 * Abstracted factory access to the database, allowing substitution (e.g. mocking) and enforcing consistent
 * usage patterns (e.g. proper closing, error checking, etc.)
 *
 * Instantiating this is for configuration only. No external work is done until {@link DaDatabaseAccess#withDatabase} is
 * called (at the earliest).
 * @implements module:dbaccess.DaProvider
 * @memberOf module:dbaccess
 * @property  * @property {{{Driver: module:dbaccess.DaDriver, DaSession: module:dbaccess.DaSession, DaTransaction: module:dbaccess.DaTransaction, DaQuery: DaQuery}}} impl - Properties
 impl - Properties
 */
class DaDatabaseAccess {
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
                /** @type module:dbaccess.DaProvider */
                this.connector = new Neo4JConnector_3_4(this, options);
                break;
            default:
                throw new Error(`The database ${database} is not supported.`);
        }
    }

    /**
     * Access the database, ensuring cleanup.
     * @param {module:dbaccess.DaProvider~driverCallback} fn Callback that performs work with access to this database.
     * @returns {Promise<*>} Returns a Promise with the value of _fn_, or reflecting any error thrown.
     */
    async withDatabase(fn) {
        let inner;
        let log = this.log;
        try {
            log.debug(`Using database ${this.database}.`);
            let val = await this.connector.withDatabase(driver => fn((inner = new DaDriver(driver, this))));
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
 * This is what to implement to provide a different database connection
 * The implementation of {@link module:dbaccess.DaProvider} needs wrappers for the following:
 * * {@link module:dbaccess.DaDriver}
 * * {@link module:dbaccess.DaSession}
 * * {@link module:dbaccess.DaTransaction}
 * * {@link module:dbaccess.DaQuery}
 * * {@link module:dbaccess.DaResult}
 * * {@link module:dbaccess.DaResultSummary}
 * * {@link module:dbaccess.DaResultStream}
 *
 * @interface DaProvider
 * @memberOf module:dbaccess
 */

/**
 * This is what to implement to provide access to the composite results of running a {@link Query}.
 * It provides access to the rows
 * or unit of possibly-repeated information.
 * @interface DaResultSummary
 * @memberOf module:dbaccess
 */

/**
 * Get an array of results from the summary.
 * @memberOf module:dbaccess.DaResultSummary
 * @method getResults
 * @returns Array.<module:dbaccess.DaResult>
 */

/**
 * This is what to implement to provide access to a result of running a {@link Query}. It provides access to one "row"
 * or unit of possibly-repeated information.
 * @interface DaResult
 * @memberOf module:dbaccess
 */

/**
 * Get a named value from the result.
 * @memberOf module:dbaccess.DaResult
 * @method get
 */

/**
 * @interface DaResultStream
 * @extends Readable
 * @memberOf module:dbaccess
 */

/**
 * Callback to do work with one database.
 *
 * @async
 * @callback module:dbaccess.DaProvider~driverCallback
 * @param {module:dbaccess.DaDriver} driver A factory for sessions (aka connections).
 * @returns {Promise<*>}
 */

/**
 * @method
 * @async
 * @name withDatabase
 * @param {module:dbaccess.DaProvider~driverCallback} fn
 * @memberOf module:dbaccess.DaProvider
 * @returns {Promise<*>}
 */

/**
 * @async
 * @callback module:dbaccess.DaDriver~sessionCallback
 * @param {module:dbaccess.DaSession} session The session (aka) connection. Not thread/async safe.
 * @returns {Promise<*>}
 */

let COUNT = 0;

/**
 * A Driver wrapper for the underlying driver implementation that serves as a factory for connections.
 * @public
 * @memberOf module:dbaccess
 */
class DaDriver {
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
     * @param {module:dbaccess.DaDriver~sessionCallback} fn The function that executes with this session
     * @param {boolean} writeAccess true if write access is needed.
     * @returns {Promise<*>} the return value from the session
     * @public
     */
    async withSession(fn, writeAccess=false) {
        let id = COUNT++;
        let dir = writeAccess ? 'WRITE' : 'READ';
        let wrapped = async session => {
            // noinspection SpellCheckingInspection
            let nsession = new DaSession(session, this);
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
     * @returns {Promise.<*>}
     */
    async close() {
        return this.driver.close();
    }
}

/**
 * @async
 * @callback module:dbaccess.DaSession~transactionCallback
 * @param {module:dbaccess.DaTransaction} transaction The transaction in which operations should be performed.
 * @returns {Promise<*>}
 */

/**
 * Session object exposed to the application code. Factory for transactions.
 * @public
 * @memberOf module:dbaccess
 */
class DaSession {
    constructor(session, parent) {
        this.session = session;
        this.log = parent.log;
        this.id = COUNT++;
    }

    /**
     * Execute a transaction. It will be committed on successful completion, or rolled back on error.
     *
     * @param {module:dbaccess.DaSession~transactionCallback} fn
     * @param {boolean} writeAccess
     * @returns {Promise<*>} The return value from the transaction.
     */
    async withTransaction(fn, writeAccess=false) {
        let id = COUNT++;
        let log = this.log;
        let name = fn.name || 'anon';
        let inner = async tx => {
            let transaction = new DaTransaction(tx, writeAccess);
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
                    await transaction.rollback(e);
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
     * @param {module:dbaccess.DaSession~transactionCallback} fn
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
     * @param {module:dbaccess.DaSession~transactionCallback} fn
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
 * @memberOf module:dbaccess
 */
class DaTransaction {
    constructor(transaction, parent, writeAccess=false) {
        this.transaction = transaction;
        this.log = parent.log;
        this.write = writeAccess;
        this.id = COUNT++;
    }

    /**
     * Execute a query.
     * @param {module:dbaccess.DaQuery} query
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

    /**
     * Give the implementation a chance to roll back if it doesn't do so organically on withTransaction.
     * @param {Error} e The cause for rollback, probably ignored.
     * @returns {Promise<*>}
     * @see module:dbaccess.DaTransaction#rollback
     */
    async rollback(e) {
        return this.transaction.rollback(e);
    }

    /**
     * Give the implementation a chance to roll back if it doesn't do so organically on withTransaction.
     * @see module:dbaccess.DaTransaction#rollback
     * @returns {Promise<*>}
     */
    async commit() {
        return this.transaction.commit();
    }

    async foo () {

    }
}

module.export = DaDatabaseAccess;
/**
 * @namespace impl
 * @type {{Driver: module:dbaccess.DaDriver, DaSession: module:dbaccess.DaSession, DaTransaction: module:dbaccess.DaTransaction, DaQuery: DaQuery}}
 */
DaDatabaseAccess.impl = {Driver: DaDriver, DaSession: DaSession, DaTransaction: DaTransaction, DaQuery: Query};