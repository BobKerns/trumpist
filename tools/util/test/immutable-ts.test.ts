/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as TS from "../immutable-ts";
import * as JS from "immutable";

const exclude = (...keys: string[]) => (k: string) => !keys.includes(k);

describe('Verify the re-exports of immutable', () => {
    const TSOwn = Reflect.ownKeys(TS).filter(exclude('path', 'PathArray')).sort();
    it('top level', () => {
        expect(TSOwn).toEqual(Reflect.ownKeys(JS).sort());
    });

    it('default', () => {
        expect(TSOwn.filter(exclude('__esModule', 'default'))).toEqual(Reflect.ownKeys((JS as any).default).sort());
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
