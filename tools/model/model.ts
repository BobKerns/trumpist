
/*
 * Copyright (c) 2018 Bob Kerns.
 */

import DatabaseAccess, {DbOptions, api} from "../database";
import {create, Logger} from "../util/logging";
import {AnyParams} from "../util/types";
import {loadQueries, ModelQueries} from "./model-queries";
const log = create("model");

export class Model {
    private session: api.Session;

    constructor(session: api.Session) {
        this.session = session;
    }

    public async setup(): Promise<ModelQueries> {
        return loadQueries(`#${this.session.database}`);
    }
}
