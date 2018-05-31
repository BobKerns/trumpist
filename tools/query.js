/*
 * Copyright (c) 2018 Bob Kerns.
 */

let COUNTER = 0;
/**
 * Abstract query (standin)
 */
class Query {
    constructor(spec) {
        // noinspection JSUnusedGlobalSymbols
        this.spec = spec;
        this.name = spec.name | `Query-${COUNTER++}`;
        this.statement = spec.statement || "";
        this.parameters = spec.parameters || {};
    }

    bindParams(params) {
        return new Query({
            statement: this.toString(),
            parameters: {
                ...params,
                ...this.parameters
            }
        });
    }

    /**
     * Return the statement as a string (if it's not already).
     * @returns string or Query
     */
    resolve() {
        if (typeof this.statement === 'string') {
            return this.statement;
        }
        return this.statement(this.parameters);
    }
}

module.exports = Query;
