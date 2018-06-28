/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as TS from "../immutable-ts";
import * as JS from "immutable";

describe('Verify the re-exports of immutable', () => {
    it('top level', () => {
        expect(Reflect.ownKeys(TS).sort()).toEqual(Reflect.ownKeys(JS).sort());
    });

    it('default', () => {
        expect(Reflect.ownKeys(TS.default).sort()).toEqual(Reflect.ownKeys((JS as any).default).sort());
    });

    it('version', () => {
        expect(TS.version).toEqual((JS as any).version);
    });

    it('Iterable', () => {
        expect(TS.Iterable).toEqual((JS as any).Iterable);
    });

    it('Range', () => {
        expect(TS.Range).toEqual((JS as any).Range);
    });
});
