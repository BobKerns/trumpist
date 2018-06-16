/*
 * Copyright (c) 2018 Bob Kerns.
 */

import QQ from '../../database/query';
import {ModelQueries} from "../../model/model-queries";
import {MockQuery} from "./mockdb";

export class MockQueries implements ModelQueries {
    public init = new MockQuery();
}

export const queries = MockQueries;
