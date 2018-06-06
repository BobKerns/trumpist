/*
 * Copyright (c) 2018 Bob Kerns.
 */
System.register([], function (exports_1, context_1) {
    "use strict";
    var _a, stringify_any, parse_any, stringify, parse;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [],
        execute: function () {
            _a = require("jsonlines"), stringify_any = _a.stringify_any, parse_any = _a.parse_any;
            exports_1("stringify", stringify = stringify_any);
            exports_1("parse", parse = parse_any);
        }
    };
});
//# sourceMappingURL=jsonlines.js.map