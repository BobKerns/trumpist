/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as api from "./api";
import {QueryParameters} from "./api";

let COUNTER = 0;

export type StatementProto = string | ((q: QueryParameters) => StatementProto);

export interface QuerySpec {
    name: string;
    statement: StatementProto;
    parameters: QueryParameters;
}

/**
 * Abstract query (standin/proxy)
 */
export default class Query {
    public readonly spec: any;
    public readonly name: string;
    public readonly statement: StatementProto;
    public readonly parameters: api.QueryParameters;

    constructor(spec: QuerySpec) {
        this.spec = spec;
        this.name = spec.name || `Query-${COUNTER++}`;
        this.statement = spec.statement || "";
        this.parameters = spec.parameters || {};
    }

    public bindParams(params: QueryParameters) {
        return new Query({
            name: this.name,
            statement: this.resolve(),
            parameters: {
                ...params,
                ...this.parameters,
            },
        });
    }

    /**
     * Return the statement as a string (if it's not already).
     */
    public resolve() {
        if (typeof this.statement === 'string') {
            return this.statement;
        }
        return this.statement(this.parameters);
    }
}