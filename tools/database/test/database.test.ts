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

describe('Database Access', () => {
    it('Instantiate access', () => {
        const access: DatabaseAccess = new DatabaseAccess({
            log: log,
            id: "test",
            parameters: {username: "test", password: "pass", url: "db://example.com"},
            database: "mock",
        });

        expect(access.database).toBe("mock");
        expect(access.id).toMatch(/^mock\/\d+$/);
    });

    it("Instantiates a DB driver", () => {
        const access: DatabaseAccess = new DatabaseAccess({
            log: log,
            id: "test",
            parameters: {username: "test", password: "pass", url: "db://example.com"},
            database: "mock",
        });
        return access.withDatabase((dbdriver) => {
            expect(dbdriver).toBeTruthy();
            expect(dbdriver.id).toMatch(/^mock\/\d+\/\d+$/);
            expect(dbdriver.database).toBe("mock");
            expect(dbdriver.log).toBeTruthy();
        });
    });

    it('errors on missing driver', () => {
        const access: DatabaseAccess = new DatabaseAccess({
            log: log,
            id: "test",
            parameters: {username: "test", password: "pass", url: "db://example.com"},
            database: "bogus",
        });
        return expect(access.withDatabase((dbdriver) => {}))
            .rejects
            .toThrow(/The database "bogus" is not supported\./);
    });
});
