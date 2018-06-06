/*
 * Copyright (c) 2018 Bob Kerns.
 */
System.register(["stream", "./api"], function (exports_1, context_1) {
    "use strict";
    var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    var stream_1, api_1, Base, Provider, Database, Session, Transaction, ResultSummary, CollectedResults, RecordStream, ResultIterator;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (stream_1_1) {
                stream_1 = stream_1_1;
            },
            function (api_1_1) {
                api_1 = api_1_1;
            }
        ],
        execute: function () {
            Base = class Base {
                constructor(impl, parent, parentDb) {
                    this.impl = impl();
                    this.log = this.parent && parent.log;
                    this.database = this.parent && parent.database || parentDb || "DB";
                    this.id = `${(this.parent && parent.id) || parentDb}/${api_1.nextId()}`;
                }
            };
            exports_1("Base", Base);
            /**
             * This is what to implement to provide a different database connection
             * The implementation of [[Provider]] needs wrapper implementations for the following:
             * * [[Database]]
             * * [[Session]]
             * * [[Transaction]]
             * * [[[Record]]
             * * [[ResultSummary]]
             * * [[RecordStream]]
             */
            Provider = class Provider extends Base {
                constructor(parent, parameters) {
                    super(() => parameters, parent);
                }
                /**
                 * Override this with any needed cleanup
                 */
                close() {
                    return __awaiter(this, void 0, void 0, function* () {
                    });
                }
            };
            exports_1("Provider", Provider);
            /**
             * This repesents a particularized access, e.g. a configured driver ready to
             * provide sessions/connections. Shared between "threads" of execution.
             */
            Database = class Database extends Base {
                constructor(impl, parent) {
                    super(impl, parent);
                }
                close() {
                    return __awaiter(this, void 0, void 0, function* () {
                    });
                }
            };
            exports_1("Database", Database);
            /**
             * One interaction with the database. Must be used as "single-threaded" and not
             * be interleaved.
             */
            Session = class Session extends Base {
                constructor(impl, parent) {
                    super(impl, parent);
                }
                /** Optional close implementation. */
                close() {
                    return __awaiter(this, void 0, void 0, function* () {
                    });
                }
            };
            exports_1("Session", Session);
            /**
             * An abstract transaction, within which we can perform multiple queries.
             */
            Transaction = class Transaction extends Base {
                /**
                 * Called if the transaction completes successfully (i.e. no error was thrown). This only needs
                 * a non-empty implementation if the database's handling of transactions doesn't do this behind
                 * the scenes.
                 */
                commit() {
                    return __awaiter(this, void 0, void 0, function* () {
                    });
                }
                /**
                 * Called if the transaction fails (i.e. an error was thrown). This only needs
                 * a non-empty implementation if the database's handling of transactions doesn't do this behind
                 * the scenes.
                 */
                rollback(e) {
                    return __awaiter(this, void 0, void 0, function* () {
                    });
                }
            };
            exports_1("Transaction", Transaction);
            /**
             * Helpful, possibly implementation-dependent information from a query.
             */
            ResultSummary = class ResultSummary {
            };
            exports_1("ResultSummary", ResultSummary);
            /**
             * This is what to implement to provide access to the composite results of running a [[Query]].
             * It provides access to the rows
             * or unit of possibly-repeated information.
             */
            CollectedResults = class CollectedResults {
            };
            exports_1("CollectedResults", CollectedResults);
            /**
             * An object-mode stream that provides a series of Record values. Once the results have been read, a
             * ResultSummary can be obtained with helpful, possibly implementation-dependent information, through
             * listening for the ```"result"``` event.
             */
            RecordStream = class RecordStream extends stream_1.Readable {
                constructor() {
                    super();
                    this.summary = new Promise((success, failure) => {
                        this
                            .on('result', summary => success(summary))
                            .on('error', e => failure(e));
                    });
                }
                getResultSummary() {
                    return this.summary;
                }
            };
            exports_1("RecordStream", RecordStream);
            ResultIterator = class ResultIterator {
            };
            exports_1("ResultIterator", ResultIterator);
        }
    };
});
//# sourceMappingURL=spi.js.map