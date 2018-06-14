"use strict";
/*
 * Copyright (c) 2018 Bob Kerns.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const neo4j_driver_1 = require("neo4j-driver");
describe('provides the proper imports', () => {
    it('provides Record value', () => expect(neo4j_driver_1.Record).toBeInstanceOf(Function));
    it('provides Integer value', () => expect(neo4j_driver_1.Integer).toBeInstanceOf(Function));
    // Interface only— verifies we can compile references to the types.
    it('provides ResultSummary type', () => {
        const rs = null;
        expect(rs).toBeNull();
    });
    it('provides Record type', () => {
        const r = null;
        expect(r).toBeNull();
    });
    it('provides Session type', () => {
        const s = null;
        expect(s).toBeNull();
    });
    it('provides Transaction type', () => {
        const tx = null;
        expect(tx).toBeNull();
    });
    // Both
    it('provides Record type', () => {
        const tx = null;
        expect(tx).toBeNull();
    });
    it('provides Integer type', () => {
        const tx = null;
        expect(tx).toBeNull();
    });
});
//# sourceMappingURL=imports.test.js.map