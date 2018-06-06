/*
 * Copyright (c) 2018 Bob Kerns.
 */


//const neo4j = require('neo4j-driver').v1;
import * as neo4j from './neo4j';
import {
    Provider,
    Database,
    Session,
    Transaction,
    Query,
    ConnectionParameters,
    DatabaseCallback,
    ResultIterator, RecordStream
} from "./spi";
import * as spi from "./spi";
import * as api from "./api";

import DatabaseAccess from "./database-access";
import {Logger} from "../util/logging";
import {QueryParameters} from "./api";
import {query} from "winston";

interface Neo4JParams extends ConnectionParameters {
    uri: string;
    user: string;
    password: string;
}

/**
 * Provider for Neo4J 3.4 database.
 */
export class Neo4JConnector_3_4 extends Provider {
    parent: DatabaseAccess;
    log: Logger;
    uri: string;
    user: string;
    password: string;

    /**
     * See [[DatabaseAccess]]
     * @param  parent   The [[DatabaseAccess]] instance that instantiated this connector.
     * @param {Object} options
     * @param options.uri
     * @param options.user
     * @param options.password
     */
    constructor(parent: DatabaseAccess, parameters: ConnectionParameters) {
        super(parent, parameters);
        let {uri, user, password, log} = parameters as Neo4JParams;
        this.uri = uri;
        this.user = user;
        this.password = password;
    }

    /**
     * @see [[Provide.withDatabase]]
     * @param  fn is called with a new driver-level
     */
    async withDatabase<T,I>(fn: DatabaseCallback<T,I>): Promise<T> {
        let neoDriver = neo4j.driver(this.uri, neo4j.auth.basic(this.user, this.password));
        let driver: any = new Neo4JDriver(neoDriver, this);
        return fn(driver as Database<I>);
    }
}

export let Neo4JConnector = Neo4JConnector_3_4;

class Neo4JDriver extends Database<neo4j.Driver> {
    constructor(driver: neo4j.Driver, parent: Neo4JConnector_3_4) {
        super(() => driver, parent);
    }

    /** @inheritDoc */
    async withSession<T, I>(fn: spi.SessionCallback<T,I>, write: boolean): Promise<T> {
        let mode = write ? neo4j.session.WRITE : neo4j.session.READ;
        let impl = this.impl.session(mode);
        let session: any = new Neo4JSession(() => impl, this);
        return await fn(session as Session<I>);
    }

    /** @inheritDoc */
    async close() {
        return await this.impl.close();
    }
}

/**
 * A Neo4J-specific session wrapper that implements our interface (which is very close to the Neo4J interface).
 */
class Neo4JSession extends spi.Session<neo4j.Session> {
    constructor(session: () => neo4j.Session, parent: Database<neo4j.Driver>) {
        super(session, parent);
    }

    /** @inheritDoc */
    async withTransaction<T, I>(fn: spi.TransactionCallback<T,any>, writeAccess=true) {
        let session = this.impl;
        if (writeAccess) {
            return await session.writeTransaction(tx => fn(new Neo4JTransaction(tx, this)));
        } else {
            return await session.readTransaction(tx => fn(new Neo4JTransaction(tx, this)));
        }
    }

    // noinspection JSCheckFunctionSignatures
    /** @inheritDoc */
    async close() {
        return this.impl.close();
    }
}

/**
 * A Neo4J-specific transaction wrapper that implements our interface (which is very close to the Neo4J interface).
 */
class Neo4JTransaction extends spi.Transaction<neo4j.Transaction> {
    constructor(transaction: neo4j.Transaction, parent: Neo4JSession) {
        super(() => transaction, parent);
    }

    // noinspection JSCheckFunctionSignatures
    /** @inheritDoc */
    async run(query: Query, params: QueryParameters) {
        let q = new Neo4JQuery(query, params);
        let {statement, parameters} = query.resolve(params);
        if (typeof statement == 'string') {
            return await this.impl.run(statement, parameters)
        }
        throw new Error("Unresolved parameters in query: ${statement}.")
    }

    query(query: Query, params: object): Promise<api.CollectedResults> {
        throw new Error("Not Implemented");
    }
    queryStream(query: Query, params: object): Promise<RecordStream> {
        throw new Error("Not Implemented");
    }
    queryIterator(query: Query, params: object): Promise<ResultIterator> {
        throw new Error("Not Implemented");
    }

}

/**
 * Internal Neo4J-specific query that captures supplied parameters, and reifies the
 * abstract query.
 */
class Neo4JQuery implements spi.Query {
    statement: api.Query | string;
    parameters: QueryParameters;
    /**
     * Capture the supplied query and parameters, and reify the statement we will supply to the server.
     * @param query
     * @param params
     */
    constructor(query: api.Query, params: api.QueryParameters) {
        let {query: nQuery, parameters: nParams} = this.bindParams(params);
        this.parameters = nParams;
    }

    resolve(params: object): api.Resolution<this> {
        let result: api.Resolution<this> = {statement: this, parameters: this.parameters};
        return result;
    }

    bindParams(params: QueryParameters) : {query: api.Query, parameters: api.QueryParameters} {
        throw new Error("Not Implemented");
    }
}

module.exports = Neo4JConnector_3_4;
