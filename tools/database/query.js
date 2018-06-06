/*
 * Copyright (c) 2018 Bob Kerns.
 */
System.register([], function (exports_1, context_1) {
    "use strict";
    var COUNTER, Query;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [],
        execute: function () {
            COUNTER = 0;
            /**
             * Abstract query (standin/proxy)
             */
            Query = class Query {
                constructor(spec) {
                    this.spec = spec;
                    this.name = spec.name || `Query-${COUNTER++}`;
                    this.statement = spec.statement || "";
                    this.parameters = spec.parameters || {};
                }
                bindParams(params) {
                    return new Query({
                        name: this.name,
                        statement: this.resolve(),
                        parameters: Object.assign({}, params, this.parameters)
                    });
                }
                /**
                 * Return the statement as a string (if it's not already).
                 */
                resolve() {
                    if (typeof this.statement === 'string') {
                        return this.statement;
                    }
                    return this.statement(this.parameters);
                }
            };
            exports_1("default", Query);
        }
    };
});
//# sourceMappingURL=query.js.map