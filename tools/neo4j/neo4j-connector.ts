/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {v1 as neo4j} from 'neo4j-driver';
import * as spi from "../database/spi";
import * as api from "../database/api";

import DatabaseAccess from "../database/database-access";
import {Logger} from "../util/logging";
import {future, Future} from "../util/future";
import {SessionMode} from "neo4j-driver/v1";
import {READ, WRITE} from "neo4j-driver/v1/driver";
import {AnyParams} from "../util/types";

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

function convertMode(mode: api.Mode): SessionMode {
    switch (mode) {
        case api.Mode.READ: return READ;
        case api.Mode.WRITE: return WRITE;
    }
}

class Neo4JDriver extends spi.DatabaseImpl<neo4j.Driver> {
    constructor(outer: Future<api.Database>, driver: neo4j.Driver, parent: Neo4JConnector_3_4) {
        super(() => driver, outer, parent);
    }

    /** @inheritDoc */
    public async withSession<T, I>(mode: api.Mode, outer: () => api.Session, fn: spi.SessionCallback<T>): Promise<T> {
        const impl = (await this.impl).session(convertMode(mode));
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
    public async withTransaction<T>(mode: api.Mode, outer: () => api.Transaction, fn: spi.TransactionCallback<T>) {
        const session = await this.impl;
        if (mode === api.Mode.WRITE) {
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

    /** @inheritDoc */
    public async run(query: spi.Query, params: AnyParams) {
        const {statement, parameters} = query.expand(params);
        return (await this.impl).run(statement, parameters);
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


spi.registerProviderFactory('neo4j', (parent, params) => new Neo4JConnector(parent, parent, params));
