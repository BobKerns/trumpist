/*
 * Copyright (c) 2018 Bob Kerns.
 */
System.register(["../util/logging", "./neo4j-connector", "./api"], function (exports_1, context_1) {
    'use strict';
    var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    var logging_1, defaultLog, neo4j_connector_1, api_1, Base, DatabaseAccess, Database, Session, Transaction;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (logging_1_1) {
                logging_1 = logging_1_1;
            },
            function (neo4j_connector_1_1) {
                neo4j_connector_1 = neo4j_connector_1_1;
            },
            function (api_1_1) {
                api_1 = api_1_1;
            }
        ],
        execute: function () {
            defaultLog = logging_1.create('database');
            Base = class Base {
                constructor(spiObject, parent, parentDb) {
                    this.spiObject = spiObject();
                    this.log = this.parent && parent.log || defaultLog;
                    this.database = this.parent && parent.database || parentDb || "DB";
                    this.id = `${(this.parent && parent.id) || parentDb}/${api_1.nextId()}`;
                }
            };
            /**
             * Abstracted factory access to the database, allowing substitution (e.g. mocking) and enforcing consistent
             * usage patterns (e.g. proper closing, error checking, etc.)
             *
             * Instantiating this is for configuration only. No external work is done until [[DatabaseAccess.withDatabase]] is
             * called (at the earliest).
             */
            DatabaseAccess = class DatabaseAccess extends Base {
                /**
                 * Create a Database Access object.
                 */
                constructor(options) {
                    let { database, log } = options;
                    let params = (options.parameters || { database, log });
                    switch (database) {
                        case "neo4j": {
                            let provider = () => new neo4j_connector_1.Neo4JConnector(this, params);
                            super(provider, undefined, database);
                            break;
                        }
                        case "neo4j@3.4": {
                            let provider = () => new neo4j_connector_1.Neo4JConnector_3_4(this, params);
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
                 * @returns {Promise<*>} Returns a ```Promise``` with the value of ```fn```, or reflecting any error thrown.
                 */
                withDatabase(fn) {
                    return __awaiter(this, void 0, void 0, function* () {
                        let log = this.log;
                        try {
                            log.debug(`Using database ${this.database}.`);
                            let val = yield this.spiObject.withDatabase(driver => fn(new Database(driver, this)));
                            log.debug(`Finished with database ${this.database}.`);
                            return val;
                        }
                        catch (e) {
                            log.debug(`Error using database ${this.database}: ${e.message}\n${e.stack}`);
                            throw e;
                        }
                    });
                }
            };
            exports_1("default", DatabaseAccess);
            /**
             * A Driver wrapper for the underlying driver implementation that serves as a factory for connections.
             * @public
             * @memberOf module:dbaccess
             */
            Database = class Database extends Base {
                // Internal
                constructor(driver, parent) {
                    super(() => driver, parent);
                }
                /**
                 * Connect to the database and prepare to begin issuing transactions.
                 *
                 * @param cb The function that executes with this session
                 * @param writeAccess true if write access is needed.
                 * @returns the return value from the session
                 */
                withSession(cb, writeAccess = false) {
                    return __awaiter(this, void 0, void 0, function* () {
                        let id = api_1.nextId();
                        let dir = writeAccess ? 'WRITE' : 'READ';
                        let wrapped = (session) => __awaiter(this, void 0, void 0, function* () {
                            let nsession = new Session(session, this);
                            try {
                                this.log.trace(`SESBEG: ${id} ${dir} Session begin`);
                                let val = yield cb(nsession);
                                this.log.trace(`SESEND: ${id} ${dir} Session returns ${val}`);
                                return val;
                            }
                            catch (e) {
                                this.log.error(`SESER: ${id} ${dir} Session failed: ${e.message}\n${e.stack}`);
                                throw e;
                            }
                            finally {
                                yield nsession.close();
                            }
                        });
                        return yield this.spiObject.withSession(wrapped, writeAccess);
                    });
                }
                /**
                 * Close the database and any open connections.
                 */
                close() {
                    return __awaiter(this, void 0, void 0, function* () {
                        return this.spiObject.close();
                    });
                }
            };
            /**
             * Session object exposed to the application code. Factory for transactions.
             */
            Session = class Session extends Base {
                constructor(session, parent) {
                    super(() => session, parent);
                }
                /**
                 * Execute a transaction. It will be committed on successful completion, or rolled back on error.
                 */
                withTransaction(fn, writeAccess = false) {
                    return __awaiter(this, void 0, void 0, function* () {
                        let id = api_1.nextId();
                        let log = this.log;
                        let name = fn.name || 'anon';
                        let inner = (tx) => __awaiter(this, void 0, void 0, function* () {
                            let transaction = new Transaction(tx, this, writeAccess);
                            let dir = writeAccess ? 'WRITE' : 'READ';
                            try {
                                // noinspection SpellCheckingInspection
                                log.trace(`TXFBEG: ${name} ${id} ${dir} transaction function begin`);
                                let val = yield fn(transaction);
                                // noinspection SpellCheckingInspection
                                log.trace(`TXFEND: ${name} ${id} ${dir} transaction function returned ${val}`);
                                if (writeAccess) {
                                    yield tx.commit();
                                }
                                return val;
                            }
                            catch (e) {
                                // noinspection SpellCheckingInspection
                                log.error(`TXFEND: ${name} ${dir} transaction failed: ${e.message}\n${e.stack}`);
                                if (writeAccess) {
                                    yield tx.rollback(e);
                                }
                                throw e;
                            }
                        });
                        try {
                            // noinspection SpellCheckingInspection
                            log.debug(`TXBEG: ${name} ${id} READ transaction begin`);
                            let val = yield this.spiObject.withTransaction(inner, writeAccess);
                            // noinspection SpellCheckingInspection
                            log.trace(`TXEND: ${name} ${id} READ transaction returned ${val}`);
                            return val;
                        }
                        catch (e) {
                            this.log.error(`END: ${name} READ transaction failed: ${e.message}\n${e.stack}`);
                            throw e;
                        }
                    });
                }
                /**
                 * Execute a read-only transaction.
                 * @param fn
                 * @returns {Promise<*>} The return value from the transaction.
                 */
                withReadTransaction(fn) {
                    return __awaiter(this, void 0, void 0, function* () {
                        return this.withTransaction(fn, false);
                    });
                }
                // noinspection JSUnusedGlobalSymbols
                /**
                 * Execute a transaction that can modify data.
                 *
                 * @param {module:dbaccess.DaSession~transactionCallback} fn
                 * @returns {Promise<*>} The return value from the transaction.
                 * @public
                 */
                withWriteTransaction(fn) {
                    return __awaiter(this, void 0, void 0, function* () {
                        return this.withTransaction(fn, true);
                    });
                }
                /**
                 * Close the session, freeing any resources
                 * @returns {Promise<*>}
                 */
                close() {
                    return __awaiter(this, void 0, void 0, function* () {
                        return this.spiObject.close();
                    });
                }
            };
            /**
             * The transaction object presented to application code
             * @memberOf module:dbaccess
             */
            Transaction = class Transaction extends Base {
                constructor(transaction, parent, writeAccess = false) {
                    super(() => transaction, parent);
                    this.writeAccess = writeAccess;
                }
                /**
                 * Execute a query.
                 * @param query The query to execute. It must be fully resolvable with the supplied params
                 * @param {Object} params Parameters to flesh out the query.
                 */
                run(query, params, fn) {
                    return __awaiter(this, void 0, void 0, function* () {
                        let name = `${query.name || 'anon'}:${this.id}:${api_1.nextId()}`;
                        let log = this.log;
                        try {
                            log.debug(`TXRUN: ${name} GO`);
                            let val = fn(query, params);
                            this.commit();
                            log.debug(`TXRUN: ${name} OK`);
                            return val;
                        }
                        catch (e) {
                            log.error(`TXRUN: ${name} FAIL: ${e.message}\n${e.stack}`);
                            this.rollback(e);
                            throw e;
                        }
                    });
                }
                /**
                 * Give the implementation a chance to roll back if it doesn't do so organically on withTransaction.
                 * @param {Error} e The cause for rollback, probably ignored.
                 */
                rollback(e) {
                    return __awaiter(this, void 0, void 0, function* () {
                        return this.spiObject.rollback(e);
                    });
                }
                /**
                 * Give the implementation a chance to roll back if it doesn't do so organically on withTransaction.
                 */
                commit() {
                    return __awaiter(this, void 0, void 0, function* () {
                        return this.spiObject.commit();
                    });
                }
                /** Perform a query and obtain the collected results all at once. */
                query(query, params) {
                    return __awaiter(this, void 0, void 0, function* () {
                        return this.run(query, params, () => this.spiObject.query(query, params));
                    });
                }
                /** Perform a query, and obtain the results as a stream. */
                queryStream(query, params) {
                    return __awaiter(this, void 0, void 0, function* () {
                        return this.run(query, params, () => this.spiObject.queryStream(query, params));
                    });
                }
                /** Perform a query, and obtain the results via async iteration. */
                queryIterator(query, params) {
                    return __awaiter(this, void 0, void 0, function* () {
                        return this.run(query, params, () => this.spiObject.queryIterator(query, params));
                    });
                }
            };
        }
    };
});
//# sourceMappingURL=database-access.js.map