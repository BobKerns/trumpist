/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {Query} from "../database/api";

/**
 * Catalog of queries to implement for a given database.
 */

export interface ModelQueries {
    /**
     * Query to initialize the database with the root and related info.
     */
    init: Query;
}
