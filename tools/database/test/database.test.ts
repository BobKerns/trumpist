/*
 * Copyright (c) 2018 Bob Kerns.
 */

import "jest";

import * as db from "..";
import DatabaseAccess, {Database, Session, Transaction} from "../database-access";

import {Logger, create} from "../../util/logging";
import {match} from "minimatch";

import {MockQuery, MockRecord, MockResultSummary} from "../../dbs/mock";
import {Parent, Mode} from "../api";

const log: Logger = create("dbtest");
/**
 * Returned from callbacks if we want to check a return value.
 * @type {string}
 */
const CALLED = "called the callback";

function createAccess({database}: {database?: string}) {
    return new DatabaseAccess({
        log: log,
        id: "test",
        parameters: {username: "test", password: "pass", url: "db://example.com"},
        database: database || "mock",
    });
}

const commonProps = ["parent", "database", "id", "log"];

// tslint:disable-next-line ban-types
function checkCommon(dbobj: Parent, cls: Function, idpattern: RegExp, ...props: string[]) {
    expect(dbobj).toBeInstanceOf(cls);
    [...commonProps, ...props].forEach(prop => expect(dbobj)
        .toHaveProperty(prop));
    expect(dbobj.database).toBe("mock");
    expect(dbobj.id).toMatch(idpattern);
    expect(dbobj.log.toString()).toBe('[Logger dbtest.DBA:info]');
    return CALLED;
}

describe('Database Access', () => {
    it('Instantiate access', () => {
        const access: DatabaseAccess = createAccess({});
        checkCommon(access, DatabaseAccess, /^mock(?:\/\d+)$/,
            "withDatabase");
    });

    it("Instantiates a DB driver", () => {
        const access: DatabaseAccess = createAccess({});
        return expect(access.withDatabase((dbdriver) => {
            return checkCommon(dbdriver, Database, /^mock(?:\/\d+){2}$/,
                "withSession");
        }))
            .resolves
            .toBe(CALLED);
    });

    it('errors on missing driver', () => {
        const access: DatabaseAccess = createAccess({database: "bogus"});
        return expect(access.withDatabase((dbdriver) => CALLED))
            .rejects
            .toThrow(/The database "bogus" is not supported\./);
    });

    it("Instantiates a session", () => {
        const access: DatabaseAccess = createAccess({});
        return expect(access.withDatabase((dbdriver) => {
            return dbdriver.withSession(Mode.READ, (session => {
                return checkCommon(session, Session, /^mock(?:\/\d+){3}$/,
                    'withTransaction');
            }));
        }))
            .resolves
            .toBe(CALLED);
    });

    it("Instantiates a transaction", () => {
        const access: DatabaseAccess = createAccess({});
        return expect(access.withDatabase((dbdriver) => {
            return dbdriver.withSession(Mode.READ, session => {
                return session.withTransaction(Mode.READ, tx => {
                   return checkCommon(tx, Transaction, /^mock(?:\/\d+){4}$/,
                       "query", "queryStream", "queryIterator");
                });
            });
        }))
            .resolves
            .toBe(CALLED);
    });

    describe('testing querying', () => {
        it("performs a collected query", () => {
            const access: DatabaseAccess = createAccess({});
            return expect(access.withDatabase((dbdriver) => {
                return dbdriver.withSession(Mode.READ, session => {
                    return session.withTransaction(Mode.READ, async tx => {
                        const x = await tx.query(new MockQuery({testData: "collected"}), {});
                        const results = await x.getResults();
                        expect(results).toBeTruthy();
                        expect(Array.isArray(results)).toBeTruthy();
                        expect(results.length).toBe(1);
                        expect(results[0]).toBeInstanceOf(MockRecord);
                        expect(results[0].get('testData')).toEqual("collected");
                        return CALLED;
                    });
                });
            }))
                .resolves
                .toBe(CALLED);
        });

        it("performs a stream query", () => {
            const access: DatabaseAccess = createAccess({});
            return expect(access.withDatabase((dbdriver) => {
                return dbdriver.withSession(Mode.READ, session => {
                    return session.withTransaction(Mode.READ, async tx => {
                        const stream = await tx.queryStream(new MockQuery({streamData: "stream"}), {});
                        return new Promise((accept, reject) => {
                            stream
                                .on('data', (data: MockRecord) => {
                                    expect(data).toBeTruthy();
                                    expect(data).toBeInstanceOf(MockRecord);
                                    expect(data.get("streamData")).toEqual("stream");
                                })
                                .on('result', (result) => {
                                    expect(result).toBeTruthy();
                                    expect(result).toBeInstanceOf(MockResultSummary);
                                })
                                .on('error', (e) => reject(e))
                                .on('end', () => accept(CALLED));
                        });

                    });
                });
            }))
                .resolves
                .toBe(CALLED);
        });
    });

});
