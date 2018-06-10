/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {v1 as neo4j} from 'neo4j-driver';
import * as spi from "./spi";
import * as api from "./api";

import DatabaseAccess from "./database-access";
import {Logger} from "../util/logging";
import {QueryParameters} from "./api";
import {future, Future} from "../util/future";

interface Neo4JParams extends spi.ConnectionParameters {
    url: string;
    user: string;
    password: string;
}

/**
 * Provider for Neo4J 3.4 database.
 */
export class Neo4JConnector_3_4 extends spi.ProviderImpl {
    public parent: DatabaseAccess;
    public log: Logger;
    protected url: string;
    protected user: string;
    protected password: string;

    /**
     * See [[DatabaseAccess]]
     * @param  parent   The [[DatabaseAccess]] instance that instantiated this connector.
     * @param options
     * @param options.url
     * @param options.user
     * @param options.password
     */
    constructor(outer: Future<DatabaseAccess>, parent: DatabaseAccess, parameters: spi.ConnectionParameters) {
        super(outer, parent, parameters);
        const {url, user, password, log} = parameters as Neo4JParams;
        this.url = url;
        this.user = user;
        this.password = password;
    }

    /**
     * @see [[Provide.withDatabase]]
     * @param  fn is called with a new driver-level
     */
    public async withDatabase<T>(outer: () => api.Database, fn: spi.DatabaseCallback<T>): Promise<T> {
        const neoDriver = neo4j.driver(this.url, neo4j.auth.basic(this.user, this.password));
        const driver: any = new Neo4JDriver(future(outer), neoDriver, this);
        return fn(driver);
    }
}

export class Neo4JConnector extends Neo4JConnector_3_4 {
    constructor(outer: DatabaseAccess, parent: DatabaseAccess, parameters: spi.ConnectionParameters) {
        super(future(() => outer), parent, parameters);
    }
}

class Neo4JDriver extends spi.DatabaseImpl<neo4j.Driver> {
    constructor(outer: Future<api.Database>, driver: neo4j.Driver, parent: Neo4JConnector_3_4) {
        super(() => driver, outer, parent);
    }

    /** @inheritDoc */
    public async withSession<T, I>(outer: () => api.Session, fn: spi.SessionCallback<T>, write: boolean): Promise<T> {
        const mode = write ? neo4j.session.WRITE : neo4j.session.READ;
        const impl = (await this.impl).session(mode);
        const session: any = new Neo4JSession(() => impl, future(outer), this);
        return await fn(session);
    }

    /** @inheritDoc */
    public async close() {
        return (await this.impl).close();
    }
}

/**
 * A Neo4J-specific session wrapper that implements our interface (which is very close to the Neo4J interface).
 */
class Neo4JSession extends spi.SessionImpl<neo4j.Session> {
    constructor(session: () => neo4j.Session, outer: Future<api.Session>, parent: spi.Database) {
        super(session, outer, parent);
    }

    /** @inheritDoc */
    public async withTransaction<T>(outer: () => api.Transaction, fn: spi.TransactionCallback<T>, writeAccess= true) {
        const session = await this.impl;
        if (writeAccess) {
            return await session.writeTransaction(tx => fn(new Neo4JTransaction(tx, future(outer), this)));
        } else {
            return await session.readTransaction(tx => fn(new Neo4JTransaction(tx, future(outer), this)));
        }
    }

    /** @inheritDoc */
    public async close() {
        return (await this.impl).close();
    }
}

/**
 * A Neo4J-specific transaction wrapper that implements our interface (which is very close to the Neo4J interface).
 */
class Neo4JTransaction extends spi.TransactionImpl<neo4j.Transaction> {
    constructor(transaction: neo4j.Transaction, outer: Future<api.Transaction>, parent: Neo4JSession) {
        super(() => transaction, outer, parent);
    }

    // noinspection JSCheckFunctionSignatures
    /** @inheritDoc */
    public async run(query: spi.Query, params: QueryParameters) {
        const q = new Neo4JQuery(query, params);
        const {statement, parameters} = query.resolve(params);
        if (typeof statement === 'string') {
            return await (await this.impl).run(statement, parameters);
        }
        throw new Error("Unresolved parameters in query: ${statement}.");
    }

    public query(query: spi.Query, params: object): Promise<api.CollectedResults> {
        throw new Error("Not Implemented");
    }
    public queryStream(query: spi.Query, params: object): Promise<spi.RecordStream> {
        throw new Error("Not Implemented");
    }
    public queryIterator(query: spi.Query, params: object): Promise<spi.ResultIterator> {
        throw new Error("Not Implemented");
    }

}

/**
 * Internal Neo4J-specific query that captures supplied parameters, and reifies the
 * abstract query.
 */
class Neo4JQuery implements spi.Query {
    public readonly statement: api.Query | string;
    public readonly parameters: QueryParameters;
    /**
     * Capture the supplied query and parameters, and reify the statement we will supply to the server.
     * @param query
     * @param params
     */
    constructor(query: api.Query, params: api.QueryParameters) {
        const {query: nQuery, parameters: nParams} = this.bindParams(params);
        this.parameters = nParams;
    }

    public resolve(params: object): api.Resolution<this> {
        const result: api.Resolution<this> = {statement: this, parameters: this.parameters};
        return result;
    }

    protected bindParams(params: QueryParameters): {query: api.Query, parameters: api.QueryParameters} {
        throw new Error("Not Implemented");
    }
}

spi.registerProviderFactory('neo4j', (parent, params) => new Neo4JConnector(parent, parent, params));
