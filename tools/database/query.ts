/*
 * Copyright (c) 2018 Bob Kerns.
 */


import {Future} from "../util/future";
import {QueryParser} from "./query-parser";

let COUNTER = 0;

/**
 * Abstract query (standin/proxy)
 */
export default class Query {
    public readonly name: string;
    public readonly parse: QueryParser;

    constructor(parse: QueryParser) {
        this.name = parse.name || `Query-${COUNTER++}`;
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
