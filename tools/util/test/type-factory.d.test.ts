/*
 * Copyright (c) 2018 Bob Kerns.
 */


// @dts-jest:pass:snap
Math.max(1);

// @dts-jest:pass:show
Math.max('123');

// @dts-jest:pass
Math.min(1, 2, 3); //=> 1

import {typeFactory} from "../type-factory";

describe('foo', () => {
    it('bar', () => {

        interface FooProps {
            a: string;
        }
        const Foo = typeFactory<FooProps>('Foo');
        type Foo = InstanceType<typeof Foo>;
        const foo = new Foo({a: 'yes'});
        expect(foo.get('a')).toBe('yes');

        // @dts-jest:pass:show Should not compile
        foo.get('b');
    });
});
