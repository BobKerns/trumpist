"use strict";
/*
 * Copyright (c) 2018 Bob Kerns.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const neo4j_driver_1 = require("neo4j-driver");
const spi = require("../database/spi");
const api = require("../database/api");
const future_1 = require("../util/future");
const driver_1 = require("neo4j-driver/v1/driver");
/**
 * Provider for Neo4J 3.4 database.
 */
class Neo4JConnector_3_4 extends spi.ProviderImpl {
    /**
     * See [[DatabaseAccess]]
     * @param  parent   The [[DatabaseAccess]] instance that instantiated this connector.
     * @param options
     * @param options.url
     * @param options.user
     * @param options.password
     */
    constructor(outer, parent, parameters) {
        super(outer, parent, parameters);
        const { url, user, password, log } = parameters;
        this.url = url;
        this.user = user;
        this.password = password;
    }
    /**
     * @see [[Provide.withDatabase]]
     * @param  fn is called with a new driver-level
     */
    withDatabase(outer, fn) {
        return __awaiter(this, void 0, void 0, function* () {
            const neoDriver = neo4j_driver_1.v1.driver(this.url, neo4j_driver_1.v1.auth.basic(this.user, this.password));
            const driver = new Neo4JDriver(future_1.future(outer), neoDriver, this);
            return fn(driver);
        });
    }
}
exports.Neo4JConnector_3_4 = Neo4JConnector_3_4;
class Neo4JConnector extends Neo4JConnector_3_4 {
    constructor(outer, parent, parameters) {
        super(future_1.future(() => outer), parent, parameters);
    }
}
exports.Neo4JConnector = Neo4JConnector;
function convertMode(mode) {
    switch (mode) {
        case api.Mode.READ: return driver_1.READ;
        case api.Mode.WRITE: return driver_1.WRITE;
    }
}
class Neo4JDriver extends spi.DatabaseImpl {
    constructor(outer, driver, parent) {
        super(() => driver, outer, parent);
    }
    /** @inheritDoc */
    withSession(mode, outer, fn) {
        return __awaiter(this, void 0, void 0, function* () {
            const impl = (yield this.impl).session(convertMode(mode));
            const session = new Neo4JSession(() => impl, future_1.future(outer), this);
            return yield fn(session);
        });
    }
    /** @inheritDoc */
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.impl).close();
        });
    }
}
/**
 * A Neo4J-specific session wrapper that implements our interface (which is very close to the Neo4J interface).
 */
class Neo4JSession extends spi.SessionImpl {
    constructor(session, outer, parent) {
        super(session, outer, parent);
    }
    /** @inheritDoc */
    withTransaction(mode, outer, fn) {
        return __awaiter(this, void 0, void 0, function* () {
            const session = yield this.impl;
            if (mode === api.Mode.WRITE) {
                return yield session.writeTransaction(tx => fn(new Neo4JTransaction(tx, future_1.future(outer), this)));
            }
            else {
                return yield session.readTransaction(tx => fn(new Neo4JTransaction(tx, future_1.future(outer), this)));
            }
        });
    }
    /** @inheritDoc */
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.impl).close();
        });
    }
}
/**
 * A Neo4J-specific transaction wrapper that implements our interface (which is very close to the Neo4J interface).
 */
class Neo4JTransaction extends spi.TransactionImpl {
    constructor(transaction, outer, parent) {
        super(() => transaction, outer, parent);
    }
    /** @inheritDoc */
    run(query, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { statement, parameters } = query.expand(params);
            return (yield this.impl).run(statement, parameters);
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
}
spi.registerProviderFactory('neo4j', (parent, params) => new Neo4JConnector(parent, parent, params));
//# sourceMappingURL=neo4j-connector.js.map