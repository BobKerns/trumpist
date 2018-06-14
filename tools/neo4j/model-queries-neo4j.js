"use strict";
/*
 * Copyright (c) 2018 Bob Kerns.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const query_1 = require("../database/query");
exports.ID_ROOT = "===THE-ROOT===";
exports.LBL_ROOT = "ROOT";
exports.ROOT_PROPS = {
    name: 'ROOT',
    startTime: 0,
    modelTime: 0,
};
class Neo4jQueries {
    constructor() {
        this.init = query_1.default `MERGE (root:${exports.LBL_ROOT} $rootProps)`
            .curry('INIT', { rootProps: exports.ROOT_PROPS });
    }
}
exports.Neo4jQueries = Neo4jQueries;
//# sourceMappingURL=model-queries-neo4j.js.map