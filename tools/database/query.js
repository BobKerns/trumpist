/*
 * Copyright (c) 2018 Bob Kerns.
 */

/**
 * @module dbaccess
 */

let COUNTER = 0;
/**
 * Abstract query (standin/proxy)
 * @memberOf module:dbaccess
 */
class DaQuery {
    constructor(spec) {
        // noinspection JSUnusedGlobalSymbols
        this.spec = spec;
        this.name = spec.name | `Query-${COUNTER++}`;
        this.statement = spec.statement || "";
        this.parameters = spec.parameters || {};
    }

    bindParams(params) {
        return new DaQuery({
            statement: this.toString(),
            parameters: {
                ...params,
                ...this.parameters
            }
        });
    }

    /**
     * Return the statement as a string (if it's not already).
     * @returns {module:dbaccess.DaQuery|string}
     */
    resolve() {
        if (typeof this.statement === 'string') {
            return this.statement;
        }
        return this.statement(this.parameters);
    }
}

module.exports = DaQuery;
