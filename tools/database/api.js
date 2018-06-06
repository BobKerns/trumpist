/*
 * Copyright (c) 2018 Bob Kerns.
 */
System.register([], function (exports_1, context_1) {
    "use strict";
    var ID_COUNTER;
    var __moduleName = context_1 && context_1.id;
    function nextId() {
        return ID_COUNTER++;
    }
    exports_1("nextId", nextId);
    return {
        setters: [],
        execute: function () {
            ;
            ID_COUNTER = 0;
        }
    };
});
//# sourceMappingURL=api.js.map