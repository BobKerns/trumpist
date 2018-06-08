/*
 * Copyright (c) 2018 Bob Kerns.
 */

import "jest";

import * as db from "..";
import DatabaseAccess from "../database-access";

import {Logger, create} from "../../util/logging";
import {match} from "minimatch";

jest.mock('../neo4j');

const log: Logger = create("dbtest");

it('Instantiate access', () => {
    const access: DatabaseAccess = new DatabaseAccess({log: log, id: "test", parameters: {lusername: "test", password: "pass", url: "db://example.com"}, database: "neo4j"});

    expect(access.database).toBe("neo4j");

});

it("Instantiates a DB driver", () => {
    const access: DatabaseAccess = new DatabaseAccess({log: log, id: "test", parameters: {lusername: "test", password: "pass", url: "db://example.com"}, database: "neo4j"});
    return access.withDatabase((dbdriver) => {
        expect(db).toBeTruthy();
    });
});
