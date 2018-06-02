/*
 * Copyright (c) 2018 Bob Kerns.
 */

/**
 * @module dbaccess
 */

const neo4j = require('neo4j-driver').v1;
/**
 * @property {object} impl -- Implementation classes.
 */
const DbDatabaseAccess = require('./database-access');
const {DaDriver, DaSession, DaTransaction, DaQuery} = DbDatabaseAccess.impl;

/**
 * Provider for Neo4J 3.4 database.
 * @implements module:dbaccess.DaProvider
 */
class Neo4JConnector_3_4 {
    /**
     * See {@link module:dbaccess.DaDatabaseAccess}
     * @param {module:dbaccess.DaDatabaseAccess} parent the [DaDatabaseAccess]{@link module:dbaccess.DaDatabaseAccess}
     *                                                   instance that instantiated this connector.
     * @param {Object} options
     * @param options.uri
     * @param options.user
     * @param options.password
     */
    constructor(parent, {uri, user, password}) {
        this.parent = parent;
        // noinspection JSUnusedGlobalSymbols
        this.log = this.parent.log;
        this.uri = uri;
        this.user = user;
        this.password = password;
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @see module:dbaccess.DaProvider#withDatabase
     * @param {module:dbaccess.DaProvider~driverCallback} fn
     * @returns {Promise<*>}
     */
    async withDatabase(fn) {
        return fn(new Neo4JDriver(neo4j.driver(this.uri, neo4j.auth.basic(this.user, this.password)), this));
    }
}

/**
 * @extends module:dbaccess.DaDriver
 */
class Neo4JDriver extends DaDriver {
    constructor(driver, parent) {
        super();
        this.driver = driver;
        this.parent = parent;
        // noinspection JSUnusedGlobalSymbols
        this.log = this.parent.log;
    }

    /** @inheritDoc */
    async withSession(fn, write=false) {
        return await fn(new Neo4JSession(this.driver.session(write ? neo4j.WRITE : neo4j.READ)));
    }

    /** @inheritDoc */
    async close() {
        return await this.driver.close();
    }
}

/**
 * A Neo4J-specific session wrapper that implements our interface (which is very close to the Neo4J interface).
 */
class Neo4JSession extends DaSession {
    constructor(session, parent) {
        super();
        this.session = session;
        this.parent = parent;
        // noinspection JSUnusedGlobalSymbols
        this.log = this.parent.log;
    }

    /** @inheritDoc */
    async withTransaction(fn, writeAccess=true) {
        let session = this.session;
        if (writeAccess) {
            return await session.withWriteTransaction(tx => fn(new Neo4JTransaction(tx, this)));
        } else {
            return await session.readTransaction(tx => fn(new Neo4JTransaction(tx, this)));
        }
    }

    // noinspection JSCheckFunctionSignatures
    /** @inheritDoc */
    async close() {
        return this.session.close();
    }
}

/**
 * A Neo4J-specific transaction wrapper that implements our interface (which is very close to the Neo4J interface).
 */
class Neo4JTransaction extends DaTransaction {
    constructor(transaction, parent) {
        super();
        this.transaction = transaction;
        this.parent = parent;
        // noinspection JSUnusedGlobalSymbols
        this.log = this.parent.log;
    }

    // noinspection JSCheckFunctionSignatures
    /** @inheritDoc */
    async run(query, params) {
        let q = new Neo4JQuery(query, params);
        return await this.transaction.run(q.statement, q.parameters)
    }
}

/**
 * Internal Neo4J-specific query that captures supplied parameters, and reifies the
 * abstract query.
 */
class Neo4JQuery extends DaQuery {
    /**
     * Capture the supplied query and parameters, and reify the statement we will supply to the server.
     * @param query
     * @param params
     */
    constructor(query, params) {
        let {query: nQuery, parameters: nParams} = query.bindParams(params);
        super(query);
        let stmt = nQuery.statement;
        if (typeof stmt !== 'string') {
            throw new Error('Query not fully resolved');
        }
        this.parameters = nParams;
    }
}

module.exports = Neo4JConnector_3_4;
