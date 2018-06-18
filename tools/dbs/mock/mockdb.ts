/*
 * Copyright (c) 2018 Bob Kerns.
 */

/**
 * Mock implementation of our database SPI. It can further be mocked with jest's mocking facility.
 */

import * as spi from "../../database/spi";
import * as api from "../../database/api";
import {ConnectionParameters} from "../../database/api";
import DatabaseAccess from "../../database/database-access";
import {Future, future} from "../../util/future";
import {AnyParams, Nullable} from "../../util/types";

export class MockProvider extends spi.ProviderImpl<null> {
    public newSPI(mode: api.Mode, outer: () => api.PMarker, impl: any): spi.Database {
        throw new Error("Method not implemented.");
    }
    public invoke<T>(mode: api.Mode, cb: (impl: null) => Promise<T>): Promise<T> {
        return cb(null);
    }
    constructor(parent: DatabaseAccess, parameters: ConnectionParameters) {
        super(future(() => parent), parent, parameters);
    }

    public async withDatabase<T>(outer: (inner: spi.Database) => api.Database, cb: spi.DatabaseCallback<T>): Promise<T> {
        const db: MockDatabase = new MockDatabase(future(() => outer(db)), this);
        return cb(db);
    }
}

export class MockDatabase extends spi.DatabaseImpl<null, null> {
    public newSPI(mode: api.Mode, outer: () => api.Session, impl: any): spi.Session {
        return new MockSession(future(outer), this, mode);
    }
    public invoke<T>(mode: api.Mode, cb: (impl: null) => Promise<T>): Promise<T> {
        return cb(null);
    }
    constructor(outer: Future<api.Database>, parent: MockProvider) {
        super(null, outer, parent);
    }

    public async withSession<T>(mode: api.Mode, outer: (inner: spi.Session) => api.Session, cb: spi.SessionCallback<T>): Promise<T> {
        const session: MockSession = new MockSession(future(() => outer(session)), this, mode);
        return cb(session);
    }
}

export class MockSession extends spi.SessionImpl<null, null> {
    public newSPI(mode: api.Mode, outer: () => api.Transaction, impl: any): spi.Transaction {
        return new MockTransaction(future(outer), this, mode);
    }
    public invoke<T>(mode: api.Mode, cb: (impl: null) => Promise<T>): Promise<T> {
        return cb(null);
    }

    public readonly mode: api.Mode;
    constructor(outer: Future<api.Session>, parent: MockDatabase, mode: api.Mode) {
        super(null, outer, parent);
        this.mode = mode;
    }

    public async withTransaction<T>(mode: api.Mode,
                                    outer: (inner: spi.Transaction) => api.Transaction,
                                    cb: spi.TransactionCallback<T>): Promise<T> {
        const tx: MockTransaction = new MockTransaction(future(() => outer(tx)), this, mode);
        return cb(tx);
    }
}

export class MockResultSummary extends spi.ResultSummary {
    private readonly query: MockQuery;
    constructor(query: MockQuery) {
        super();
        this.query = query;
    }
}

export class MockCollectedResults extends spi.CollectedResults {
    public readonly query: MockQuery;
    private readonly results: MockRecord[];

    constructor(query: MockQuery) {
        super();
        this.query = query;
        if (Array.isArray(query.result)) {
            this.results = query.result.map((r: AnyParams) => new MockRecord(r));
        }
    }
    public async getResultSummary(): Promise<MockResultSummary> {
        return new MockResultSummary(this.query);
    }

    public async getResults(): Promise<MockRecord[]> {
        return this.results;
    }
}

export class MockRecord implements api.Record {
    private readonly data: AnyParams;
    constructor(data: AnyParams) {
        this.data = data;
    }

    public get(key: string): any {
        if (! this.data.hasOwnProperty(key)) {
            throw new Error(`Key ${key} is not present in the result, even as a null.`);
        }
        return this.data[key];
    }
}

export class MockIteratorResult implements IteratorResult<MockRecord> {
    public done: boolean = true;
    public value: MockRecord;
    constructor(record: MockRecord) {
        this.value = record;
    }
}

export class MockResultIterator extends spi.ResultIterator {
    private results: MockCollectedResults;
    private iterator: Promise<Iterator<MockRecord>>;
    constructor(query: MockQuery) {
        const results = new MockCollectedResults(query);
        super();
        this.results = results;
        this.iterator = results.getResults()
            .then(r => r.values());
    }
    public [Symbol.asyncIterator](): AsyncIterableIterator<MockRecord> {
        return this;
    }

    public async getResultSummary(): Promise<MockResultSummary> {
        return this.results.getResultSummary();
    }

    public async next(value?: any): Promise<IteratorResult<MockRecord>> {
        return (await this.iterator).next();
    }
}

export class MockRecordStream extends spi.RecordStream {
    public query: MockQuery;
    constructor(query: MockQuery) {
        super();
        this.query = query;
    }

    public _read() {
        const result = this.query.result;
        if (result instanceof Error) {
            const e = new Error(result.message);
            Object.assign(e, result);
            (e as any).prototype = (result as any).prototype;
            this.emit('error', e);
            return;
        }
        result.forEach(r => this.emit('data', new MockRecord(r)));
        this.emit('result', new MockResultSummary(this.query));
        this.emit('end');
    }

    public getResultSummary(): Promise<MockResultSummary> {
        return super.getResultSummary() as Promise<MockResultSummary>;
    }
}


export class MockQuery implements spi.Query {
    public name: string;
    public parameters: AnyParams;
    public statement: string;
    public result: AnyParams[] | Error;
    constructor(...result: Array<(AnyParams|Error)>) {
        this.result = result;
    }

    public expand(params: object): api.ExpandResult {
        return {
            statement: this.statement,
            parameters: {},
            missing: [],
            unused: [],
        };
    }

    /**
     * We don't really curry because we've specified what results we want.
     * @param {Nullable<string>} name
     * @param {AnyParams} params
     * @returns {MockQuery}
     */
    public curry(name: Nullable<string>, params: AnyParams): MockQuery {
        return this;
    }
}

export class MockTransaction extends spi.TransactionImpl<null> {
    public readonly mode: api.Mode;
    constructor(outer: Future<api.Transaction>, parent: spi.Session, mode: api.Mode) {
        super(null, outer, parent);
        this.mode = mode;
    }
    public async query(query: MockQuery, params: object): Promise<spi.CollectedResults> {
        return new MockCollectedResults(query);
    }

    public async queryIterator(query: MockQuery, params: object): Promise<spi.ResultIterator> {
        return new MockResultIterator(query);
    }

    public async queryStream(query: MockQuery, params: object): Promise<spi.RecordStream> {
        return new MockRecordStream(query);
    }
}

spi.registerProviderFactory('mock', (parent, params) => new MockProvider(parent, params));
