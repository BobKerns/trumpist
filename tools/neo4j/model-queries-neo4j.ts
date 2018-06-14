/*
 * Copyright (c) 2018 Bob Kerns.
 */

import Q from '../database/query';
import {AnyParams} from "../util/types";
import {ModelQueries} from "../model/model-queries";

import {convertDateTime} from "../database/index";

export const ID_ROOT = "===THE-ROOT===";
export const LBL_ROOT = "ROOT";
export const ROOT_PROPS: AnyParams = {
    name: 'ROOT',
    startTime: 0,
    modelTime: 0,
};

export class Neo4jQueries implements ModelQueries {
    public init = Q`MERGE (root:${LBL_ROOT} $rootProps)`
        .curry('INIT', {rootProps: ROOT_PROPS});
}

