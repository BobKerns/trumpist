/*
 * Copyright (c) 2018 Bob Kerns.
 */

/**
 * Mock implementation of our database SPI. It can further be mocked with jest's mocking facility.
 */

import * as spi from "../spi";
import * as api from "../api";
import DatabaseAccess from "../database-access";
import {ConnectionParameters} from "../api";
import {CollectedResults, ResultIterator} from "../spi";
import {Future, future} from "../../util/future";

export class MockProvider extends spi.ProviderImpl {
    constructor(parent: DatabaseAccess, parameters: ConnectionParameters) {
        super(future(() => parent), parent, parameters);
    }

    public async withDatabase<T>(outer: () => api.Database, cb: spi.DatabaseCallback<T>): Promise<T> {
        return cb(new MockDatabase(future(outer), this));
    }
}

export class MockDatabase extends spi.DatabaseImpl<void> {
    constructor(outer: Future<api.Database>, parent: MockProvider) {
        super(() => {}, outer, parent);
    }

    public async withSession<T>(outer: () => api.Session, cb: spi.SessionCallback<T>, writeAccess: boolean): Promise<T> {
        return cb(new MockSession(future(outer), this));
    }
}

export class MockSession extends spi.SessionImpl<void> {
    constructor(outer: Future<api.Session>, parent: MockDatabase) {
        super(() => {}, outer, parent);
    }

    public async withTransaction<T>(outer: () => api.Transaction, cb: spi.TransactionCallback<T>, writeAccess: boolean): Promise<T> {
        return cb(new MockTransaction(future(outer), this));
    }
}

export class MockResultSummary extends spi.ResultSummary {
}

export class MockCollectedResults extends spi.CollectedResults {
    public async getResultSummary(): Promise<spi.ResultSummary> {
        return new MockResultSummary();
    }

    public getResults(): api.Record[] {
        return [];
    }
}

export class MockRecord implements api.Record {
    public get(key: string): any {
        return null;
    }
}

export class MockIteratorResult implements IteratorResult<api.Record> {
    public done: boolean = true;
    public value: api.Record = new MockRecord();
}

export class MockResultIterator extends spi.ResultIterator {
    public [Symbol.asyncIterator](): AsyncIterableIterator<api.Record> {
        return new MockResultIterator();
    }

    public async getResultSummary(): Promise<MockResultSummary> {
        return new MockResultSummary();
    }

    public async next(value?: any): Promise<IteratorResult<api.Record>> {
        return new MockIteratorResult();
    }
}

export class MockRecordStream extends spi.RecordStream {
    constructor() {
        super();
    }
}

export class MockTransaction extends spi.TransactionImpl<void> {
    constructor(outer: Future<api.Transaction>, parent: spi.Session) {
        super(() => {}, outer, parent);
    }
    public async query(query: spi.Query, params: object): Promise<spi.CollectedResults> {
        return new MockCollectedResults();
    }

    public async queryIterator(query: spi.Query, params: object): Promise<spi.ResultIterator> {
        return new MockResultIterator();
    }

    public async queryStream(query: spi.Query, params: object): Promise<spi.RecordStream> {
        return new MockRecordStream();
    }
}

spi.registerProviderFactory('mock', (parent, params) => new MockProvider(parent, params));
