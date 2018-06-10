/*
 * Copyright (c) 2018 Bob Kerns.
 */

import "jest";

import * as db from "..";
import DatabaseAccess from "../database-access";

import {Logger, create} from "../../util/logging";
import {match} from "minimatch";

import "./mockdb";


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

describe('Database Access', () => {
    it('Instantiate access', () => {
        const access: DatabaseAccess = createAccess({});
        expect(access.database).toBe("mock");
        expect(access.id).toMatch(/^mock\/\d+$/);
        expect(access.log.toString()).toBe(log.toString());
    });

    it("Instantiates a DB driver", () => {
        const access: DatabaseAccess =createAccess({});
        return expect(access.withDatabase((dbdriver) => {
            expect(dbdriver).toBeTruthy();
            expect(dbdriver.id).toMatch(/^mock\/\d+\/\d+$/);
            expect(dbdriver.database).toBe("mock");
            expect(dbdriver.log.toString()).toBe(log.toString());
            return CALLED;
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
                expect(session)
                    .toHaveProperty('withReadTransaction');
                return CALLED;
            }))
        }))
            .resolves
            .toBe(CALLED);
    });
});
