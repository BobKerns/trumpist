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

export async function loadQueries(id: string): Promise<ModelQueries> {
    if (id.startsWith('#')) {
        const bareId = id.substring(1);
        const fullId = `../dbs/${bareId}/model-queries-${bareId}`;
        const imported = (await (import(fullId)));
        const queryClass = imported.queries;
        return new queryClass();
    }
    return (await (import(id))).queries;
}

