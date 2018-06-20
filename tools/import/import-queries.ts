/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {api} from "../database";

export interface ImportQueries {
    readonly ROOTS: api.Query;
    readonly LINK_ROOTS: api.Query;
    readonly ADD_TYPE: api.Query;
    readonly ADD_TAG: api.Query;
    readonly ADD_SPECIAL: api.Query;
    readonly ADD_LINK: api.Query;
    readonly ID_CONSTRAINT_NODE: api.Query;
    readonly ID_CONSTRAINT_META: api.Query;
    readonly INDEX_NODE_NAME: api.Query;
    readonly INDEX_NODE_LABEL: api.Query;
    readonly CONSTRAINT_TYPE_NAME: api.Query;
    readonly INDEX_TYPE_LABEL: api.Query;
    readonly CONSTRAINT_TAG_NAME: api.Query;
    readonly INDEX_TAG_LABEL: api.Query;
    readonly CONSTRAINT_LINK_NAME: api.Query;
    readonly INDEX_LINK_LABEL: api.Query;
    readonly CONSTRAINT_SPECIAL_NAME: api.Query;
    readonly INDEX_SPECIAL_LABEL: api.Query;
    readonly LOAD_TYPE_LABELS: api.Query;
    readonly LINK_STATEMENT: api.Query;
    readonly NODE_STATEMENT: api.Query;
}
