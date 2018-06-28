/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {Path, path, PathArray} from "../type-factory";

import "jest";
import {accepting, producing} from "../type-test-aids";


interface XX {
    a: {
        b: {
            c: [3, 5];
        };
    };
    // Important: the depth varies. Failing to narrow the type to the specific key will result in failing to find
    // deeper keys.
    d: {
        e: number;
    };

}
const v: XX = {a: {b: {c: [3, 5]}}, d: {e: 88}};

interface XO {
  g: 'flat' | 'minor';
};

// @dts-jest:group PathStep types

// @dts-jest:pass:snap  Untyped
path();

// @dts-jest:pass:snap Typed initial
path<XX>();

// @dts-jest:pass:snap Step 1
path<XX>()('a');

// @dts-jest:pass:snap Step 2
path<XX>()('a')('b');

// @dts-jest:pass:snap Step 3
path<XX>()('a')('b')('c');

// @dts-jest:pass:snap final
path<XX>()('a')('b')('c')();

// @dts-jest:fail:snap negative on wrong index to step
path<XX>()('b');

// @dts-jest:pass:snap can index arrays
path<XX>()('a')('b')('c')(1)();

// @dts-jest:group Path types

// @dts-jest:pass:snap assign
accepting<Path<XX, number>>(() => path<XX>()('d')('e')());

// @dts-jest:fail:snap assign fail to
accepting<Path<XX, string>>(() => path<XX>()('d')('e')());

// @dts-jest:fail:snap assign fail from
accepting<Path<XO, number>>(() => path<XX>()('d')('e')());

// @dts-jest:group PathArray types

// @dts-jest:pass:snap Path array positive
accepting<PathArray<XX, number>>(() => path<XX>()('d')('e')().path);

// @dts-jest:fail:snap Path array negative
accepting<PathArray<XX, string>>(() => path<XX>()('d')('e')().path);

// @dts-jest:pass:snap can index arrays
accepting<PathArray<XX, 5>>(() => path<XX>()('a')('b')('c')(1)().path);

// @dts-jest:group get()

// @dts-jest:pass:snap get unbound
path<XX>()('a')().get();

// @dts-jest:pass:snap get invoked
path<XX>()('a')().get()(v);

// @dts-jest:group set()

// @dts-jest:pass:snap set unbound
path<XX>()('d')().set();

// @dts-jest:pass:snap set value provided
path<XX>()('d')('e')().set(7);

// @dts-jest:pass:snap set value provided invoked
path<XX>()('d')('e')().set(7)(v);

// @dts-jest:pass:snap set novalue
path<XX>()('d')('e')().set();

// @dts-jest:pass:snap set novalue valued
path<XX>()('d')('e')().set()(7);

// @dts-jest:pass:snap set novalue valued invoked
path<XX>()('d')('e')().set()(7)(v);

function getIn<F extends object, T>(p: PathArray<F, T>, obj?: F): T {
    return producing<T>();
}

// @dts-jest:group PathArray types can be applied.

const tPath = path<XX>()('a')('b')();

// @dts-jest:pass:snap PathArray conveys to type:
getIn(tPath.path, v);

// @dts-jest:fail:snap PathArray conveys from type:
getIn(tPath.path, {q: 'q'});

