/*
 * Copyright (c) 2018 Bob Kerns.
 */

import "jest";
import {Model} from "../model";
import * as api from "../../database/api";
import DatabaseAccess from "../../database/database-access";
import {PromiseReject} from "../../util/types";
import {ManualPromise} from "../../util/future";
// import "../../dbs/mock";
import {MockQuery} from "../../dbs/mock";
import {MockQueries} from "../../dbs/mock/model-queries-mock";

let session: Promise<api.Session>;
const done = new ManualPromise<undefined>();
let finished: Promise<void>;

beforeAll(async () => {
    return session = new Promise((accept, reject) => {
        const dbAccess = new DatabaseAccess({database: "mock"});
        finished = dbAccess.withDatabase(db =>
            db.withSession(api.Mode.WRITE, async s => {
                accept(s);
                await done;
            }));
    });
});

afterAll(async () => {
    // Let the DB close
    done.resolve(undefined);
    // And wait for it to close.
    await finished;
});

describe('tests the model setup', () => {
    it('loads the queries', async () => {
        const model = new Model(await session);
        const queries = await model.queries;
        expect(queries).toBeInstanceOf(MockQueries);
        expect(queries.init).toBeInstanceOf(MockQuery);
    });
});
