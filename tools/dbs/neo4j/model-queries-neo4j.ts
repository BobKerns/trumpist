/*
 * Copyright (c) 2018 Bob Kerns.
 */

import Q from '../../database/query';
import {AnyParams} from "../../util/types";
import {ModelQueries} from "../../model/model-queries";

import {convertDateTime} from "./neo4j-date";

export const ID_ROOT = "===THE-ROOT===";
export const LBL_ROOT = "_ROOT";
export const ROOT_PROPS: AnyParams = {
    id: ID_ROOT,
    name: 'ROOT',
};
export const INIT_BRANCH_PROPS = {
};

export const INIT_COMMIT_PROPS = {
    description: "Initial Commit",
};

const COMMIT_PROLOG = `
WITH timestamp() as TIME
MATCH (_ROOT:_ROOT)-[:_BRANCH]->(_BRANCH:_BRANCH {name: $_BRANCH})
OPTIONAL MATCH (_BRANCH)->[_OLD:_HEAD]->(:_COMMIT)
CREATE (_BRANCH)-[:HEAD]->(commit:_COMMIT {model_start: TIME})
DELETE _OLD
`;


export class Neo4jQueries implements ModelQueries {
    public init = Q`
    MERGE (root:${LBL_ROOT} $[rootProps])-[branch:_BRANCH {name: 'MASTER'}]->(commit:_COMMIT)
    ON CREATE SET branch += $branchProps,
                  commit += $commitProps,
                  root.commitTime = datetime.transaction(),
                  branch.commitTime = datetime.transaction(),
                  commit.commitTime = datetime.transaction()
    RETURN root, branch, commit
    `
        .curry('INIT', {
            rootProps: ROOT_PROPS,
            branchProps: INIT_BRANCH_PROPS,
            commitProps: INIT_COMMIT_PROPS,
        });
}

export const queries = Neo4jQueries;
