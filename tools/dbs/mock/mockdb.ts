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

    public async withSession<T>(mode: api.Mode, outer: () => api.Session, cb: spi.SessionCallback<T>): Promise<T> {
        return cb(new MockSession(future(outer), this, mode));
    }
}

export class MockSession extends spi.SessionImpl<void> {
    public readonly mode: api.Mode;
    constructor(outer: Future<api.Session>, parent: MockDatabase, mode: api.Mode) {
        super(() => {}, outer, parent);
        this.mode = mode;
    }

    public async withTransaction<T>(mode: api.Mode, outer: () => api.Transaction, cb: spi.TransactionCallback<T>): Promise<T> {
        return cb(new MockTransaction(future(outer), this, mode));
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

    public getResults(): MockRecord[] {
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
            throw new Error(`Key ${key} is not present in the result, even as a null.`)
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
    private iterator: Iterator<MockRecord>;
    constructor(query: MockQuery) {
        let results = new MockCollectedResults(query);
        super();
        this.results = results;
        this.iterator = results.getResults().values();
    }
    public [Symbol.asyncIterator](): AsyncIterableIterator<MockRecord> {
        return this;
    }

    public async getResultSummary(): Promise<MockResultSummary> {
        return this.results.getResultSummary();
    }

    public async next(value?: any): Promise<IteratorResult<MockRecord>> {
        return this.iterator.next();
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
            let e = new Error(result.message);
            Object.assign(e, result);
            (e as any).prototype = (result as any).prototype;
            this.emit('error', e);
            return;
        }
        result.forEach(r => this.emit('data', new MockRecord(r)));
        this.emit('result', new MockResultSummary(this.query));
        this.emit('end');
    }

    public getResultSummary() : Promise<MockResultSummary> {
        return super.getResultSummary() as Promise<MockResultSummary>;
    }
}


export class MockQuery implements spi.Query {
    public name: string;
    public parameters: AnyParams;
    public statement: string;
    public result: AnyParams[] | Error;
    constructor(...result: (AnyParams|Error)[]) {
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
     * We don't really curry because we've specifid what results we want.
     * @param {Nullable<string>} name
     * @param {AnyParams} params
     * @returns {MockQuery}
     */
    public curry(name: Nullable<string>, params: AnyParams): MockQuery {
        return this;
    }
}

export class MockTransaction extends spi.TransactionImpl<void> {
    public readonly mode: api.Mode;
    constructor(outer: Future<api.Transaction>, parent: spi.Session, mode: api.Mode) {
        super(() => {}, outer, parent);
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
