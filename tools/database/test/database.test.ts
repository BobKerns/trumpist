/*
 * Copyright (c) 2018 Bob Kerns.
 */

import "jest";

import * as db from "..";
import DatabaseAccess, {Database, Session, Transaction} from "../database-access";

import {Logger, create} from "../../util/logging";
import {match} from "minimatch";

import "./mockdb";
import {Parent} from "../api";


jest.mock('../neo4j');

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

function checkCommon(dbobj: Parent, cls: Function, idpattern: RegExp, ...props: string[]) {
    expect(dbobj).toBeInstanceOf(cls);
    [...commonProps, ...props].forEach(prop => expect(dbobj)
        .toHaveProperty(prop));
    expect(dbobj.database).toBe("mock");
    expect(dbobj.id).toMatch(idpattern);
    expect(dbobj.log.toString()).toBe(log.toString());
    return CALLED;
}

describe('Database Access', () => {
    it('Instantiate access', () => {
        const access: DatabaseAccess = createAccess({});
        checkCommon(access, DatabaseAccess, /^mock(?:\/\d+)$/,
            "withDatabase");
    });

    it("Instantiates a DB driver", () => {
        const access: DatabaseAccess =createAccess({});
        return expect(access.withDatabase((dbdriver) => {
            return checkCommon(dbdriver, Database, /^mock(?:\/\d+){2}$/,
                "withSession")
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
            return dbdriver.withSession((session => {
                return checkCommon(session, Session, /^mock(?:\/\d+){3}$/,
                    'withTransaction');
            }))
        }))
            .resolves
            .toBe(CALLED);
    });

    it("Instantiates a transaction", () => {
        const access: DatabaseAccess = createAccess({});
        return expect(access.withDatabase((dbdriver) => {
            return dbdriver.withSession((session => {
                return session.withTransaction(tx => {
                   return checkCommon(tx, Transaction, /^mock(?:\/\d+){4}$/,
                       "query", "queryStream", "queryIterator");
                }, true);
            }))
        }))
            .resolves
            .toBe(CALLED);
    });
});
