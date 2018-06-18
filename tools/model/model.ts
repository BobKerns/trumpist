
/*
 * Copyright (c) 2018 Bob Kerns.
 */

import DatabaseAccess, {DbOptions, api} from "../database";
import {create, Logger} from "../util/logging";
import {AnyParams} from "../util/types";
import {loadQueries, ModelQueries} from "./model-queries";
import * as util from "util";
import {CollectedResults} from "../database/api";
const log = create("model");

export class Model {
    private readonly session: api.Session;
    public readonly queries: Promise<ModelQueries>;

    constructor(session: api.Session) {
        this.session = session;
        this.queries = loadQueries(`#${this.session.database}`);
    }

    public async init(): Promise<CollectedResults> {
        return this.session.withTransaction(api.Mode.WRITE, async tx => {
            const queries = await this.queries;
            const result = await tx.query(queries.init, {});
            return result;
        });
    }
}
