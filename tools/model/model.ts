
/*
 * Copyright (c) 2018 Bob Kerns.
 */

import DatabaseAccess, {DbOptions, api} from "../database";
import {create, Logger} from "../util/logging";
import {AnyParams} from "../util/types";
const log = create("model");

class Model {
    private session: api.Session;

    constructor(session: api.Session) {
        this.session = session;
    }
}
