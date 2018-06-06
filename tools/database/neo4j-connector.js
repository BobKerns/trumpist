/*
 * Copyright (c) 2018 Bob Kerns.
 */
System.register(["./neo4j", "./spi"], function (exports_1, context_1) {
    "use strict";
    var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    var neo4j, spi_1, spi, Neo4JConnector_3_4, Neo4JConnector, Neo4JDriver, Neo4JSession, Neo4JTransaction, Neo4JQuery;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (neo4j_1) {
                neo4j = neo4j_1;
            },
            function (spi_1_1) {
                spi_1 = spi_1_1;
                spi = spi_1_1;
            }
        ],
        execute: function () {
            /**
             * Provider for Neo4J 3.4 database.
             */
            Neo4JConnector_3_4 = class Neo4JConnector_3_4 extends spi_1.Provider {
                /**
                 * See [[DatabaseAccess]]
                 * @param  parent   The [[DatabaseAccess]] instance that instantiated this connector.
                 * @param {Object} options
                 * @param options.uri
                 * @param options.user
                 * @param options.password
                 */
                constructor(parent, parameters) {
                    super(parent, parameters);
                    let { uri, user, password, log } = parameters;
                    this.uri = uri;
                    this.user = user;
                    this.password = password;
                }
                /**
                 * @see [[Provide.withDatabase]]
                 * @param  fn is called with a new driver-level
                 */
                withDatabase(fn) {
                    return __awaiter(this, void 0, void 0, function* () {
                        let neoDriver = neo4j.driver(this.uri, neo4j.auth.basic(this.user, this.password));
                        let driver = new Neo4JDriver(neoDriver, this);
                        return fn(driver);
                    });
                }
            };
            exports_1("Neo4JConnector_3_4", Neo4JConnector_3_4);
            exports_1("Neo4JConnector", Neo4JConnector = Neo4JConnector_3_4);
            Neo4JDriver = class Neo4JDriver extends spi_1.Database {
                constructor(driver, parent) {
                    super(() => driver, parent);
                }
                /** @inheritDoc */
                withSession(fn, write) {
                    return __awaiter(this, void 0, void 0, function* () {
                        let mode = write ? neo4j.session.WRITE : neo4j.session.READ;
                        let impl = this.impl.session(mode);
                        let session = new Neo4JSession(() => impl, this);
                        return yield fn(session);
                    });
                }
                /** @inheritDoc */
                close() {
                    return __awaiter(this, void 0, void 0, function* () {
                        return yield this.impl.close();
                    });
                }
            };
            /**
             * A Neo4J-specific session wrapper that implements our interface (which is very close to the Neo4J interface).
             */
            Neo4JSession = class Neo4JSession extends spi.Session {
                constructor(session, parent) {
                    super(session, parent);
                }
                /** @inheritDoc */
                withTransaction(fn, writeAccess = true) {
                    return __awaiter(this, void 0, void 0, function* () {
                        let session = this.impl;
                        if (writeAccess) {
                            return yield session.writeTransaction(tx => fn(new Neo4JTransaction(tx, this)));
                        }
                        else {
                            return yield session.readTransaction(tx => fn(new Neo4JTransaction(tx, this)));
                        }
                    });
                }
                // noinspection JSCheckFunctionSignatures
                /** @inheritDoc */
                close() {
                    return __awaiter(this, void 0, void 0, function* () {
                        return this.impl.close();
                    });
                }
            };
            /**
             * A Neo4J-specific transaction wrapper that implements our interface (which is very close to the Neo4J interface).
             */
            Neo4JTransaction = class Neo4JTransaction extends spi.Transaction {
                constructor(transaction, parent) {
                    super(() => transaction, parent);
                }
                // noinspection JSCheckFunctionSignatures
                /** @inheritDoc */
                run(query, params) {
                    return __awaiter(this, void 0, void 0, function* () {
                        let q = new Neo4JQuery(query, params);
                        let { statement, parameters } = query.resolve(params);
                        if (typeof statement == 'string') {
                            return yield this.impl.run(statement, parameters);
                        }
                        throw new Error("Unresolved parameters in query: ${statement}.");
                    });
                }
                query(query, params) {
                    throw new Error("Not Implemented");
                }
                queryStream(query, params) {
                    throw new Error("Not Implemented");
                }
                queryIterator(query, params) {
                    throw new Error("Not Implemented");
                }
            };
            /**
             * Internal Neo4J-specific query that captures supplied parameters, and reifies the
             * abstract query.
             */
            Neo4JQuery = class Neo4JQuery {
                /**
                 * Capture the supplied query and parameters, and reify the statement we will supply to the server.
                 * @param query
                 * @param params
                 */
                constructor(query, params) {
                    let { query: nQuery, parameters: nParams } = this.bindParams(params);
                    this.parameters = nParams;
                }
                resolve(params) {
                    let result = { statement: this, parameters: this.parameters };
                    return result;
                }
                bindParams(params) {
                    throw new Error("Not Implemented");
                }
            };
            module.exports = Neo4JConnector_3_4;
        }
    };
});
//# sourceMappingURL=neo4j-connector.js.map