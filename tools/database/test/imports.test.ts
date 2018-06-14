/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {Record, Result, ResultSummary, Transaction, Session, Integer} from "neo4j-driver/v1";

describe('provides the proper imports', () => {
    it('provides Record value', () => expect(Record).toBeInstanceOf(Function));
    it('provides Integer value', () => expect(Integer).toBeInstanceOf(Function));

    // Interface only— verifies we can compile references to the types.
    it('provides ResultSummary type', () => {
        const rs: ResultSummary<number> | null = null;
        expect(rs).toBeNull();
    });
    it('provides Record type', () => {
        const r: Result | null = null;
        expect(r).toBeNull();
    });
    it('provides Session type', () => {
        const s: Session | null = null;
        expect(s).toBeNull();
    });
    it('provides Transaction type', () => {
        const tx: Transaction | null = null;
        expect(tx).toBeNull();
    });

    // Both

    it('provides Record type', () => {
        const tx: Record | null = null;
        expect(tx).toBeNull();
    });
    it('provides Integer type', () => {
        const tx: Integer | null = null;
        expect(tx).toBeNull();
    });
});
