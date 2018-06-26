/*
 * Copyright (c) 2018 Bob Kerns.
 */

import "jest";
import {path, PathStep, typeFactory} from "../type-factory";

describe('Test type factory', () => {
    it('defines a class', () => {
        interface FooProps {
            a: string;
        }

        const Foo = typeFactory<FooProps>('Foo');
        type Foo = InstanceType<typeof Foo>;
        expect(typeof Foo).toBe('function');
        expect(Foo.name).toBe('Foo');
        expect(typeof Foo.prototype).toBe('object');
        expect(Foo.prototype.constructor).toBe(Foo);
    });

    it('can be instantiated', () => {
        interface FooProps {
            a: string;
        }

        const Foo = typeFactory<FooProps>('Foo');
        type Foo = InstanceType<typeof Foo>;
        const foo = new Foo({a: 'HI!'});
        expect(foo.a).toBe('HI!');
        expect(foo).toBeInstanceOf(Foo);
    });

    it('supports supertypes', () => {
        interface FooProps {
            a: string;
        }

        const Foo = typeFactory<FooProps>('Foo');
        type Foo = InstanceType<typeof Foo>;

        interface BarProps extends FooProps {
            b: string;
        }

        const Bar = typeFactory<BarProps>('Bar', Foo);
        type Bar = InstanceType<typeof Bar>;
        const bar = new Bar({a: 'HI!', b: 'There!'});
        expect(bar.a).toBe('HI!');
        expect(bar.b).toBe('There!');
        expect(bar).toBeInstanceOf(Bar);
        expect(bar).toBeInstanceOf(Foo);
    });

    it('supports get()', () => {
        interface FooProps {
            a: string;
        }

        const Foo = typeFactory<FooProps>('Foo');
        type Foo = InstanceType<typeof Foo>;
        const foo = new Foo({a: 'yes'});
        expect(foo.get('a')).toBe('yes');
        // foo.get('b') should not compile.
    });


    it('supports set()', () => {
        interface FooProps {
            a: string;
        }

        const Foo = typeFactory<FooProps, 'a'>('Foo');
        type Foo = InstanceType<typeof Foo>;
        const foo = new Foo({a: 'yes'});
        expect(foo.set('a', "maybe")).toEqual({a: 'maybe'});
        expect(foo).toEqual({a: 'yes'});
    });
});

describe("paths work.", () => {

    interface XX {
        a: {
            b: {
                c: [3, 5];
            };
        };
        // Important: the depth varies. Failing to narrow the type to the specific key will result in failing to find
        // deeper keys.
        d: {
            e: 88;
        };

    }

    const v: XX = {a: {b: {c: [3, 5]}}, d: {e: 88}};

    it('Paths  work to the zeroth level', () => {
        const p = path<typeof v>()();
        expect(typeof p).toBe('function');
        expect(p.length).toBe(1);
        expect(typeof p.get).toBe('function');
        expect(p.get.length).toBe(0);
        const g = p.get();
        expect(typeof g).toBe('function');
        expect(g.length).toBe(1);
        expect(g(v)).toBe(v);
    });

    it('Paths  work to the first level', () => {
        const p = path<typeof v>()('a')();
        expect(typeof p).toBe('function');
        expect(p.length).toBe(1);
        expect(p.get()(v)).toBe(v.a);
    });

    it('Paths  work to the second level', () => {
        const p = path<typeof v>()('a')('b')();
        expect(typeof p).toBe('function');
        expect(p.length).toBe(1);
        expect(p.get()(v)).toBe(v.a.b);
    });

    it('Paths follow a type without confusion from shorter branches.', () => {
        const p = path<typeof v>()('a')('b')('c')();
        expect(p.get()(v)).toEqual(v.a.b.c);
    });
});

describe('Bound paths', () => {
    it.skip('Records support Paths', () => {
        interface FooProps {
            a: string;
        }
        const Foo = typeFactory<FooProps>('Foo');
        type Foo = InstanceType<typeof Foo>;
        interface BarProps {
            foo: FooProps;
        }
        const Bar = typeFactory<BarProps>('Bar', Foo);
        type Bar = InstanceType<typeof Bar>;
        const bar = new Bar({foo: new Foo({a: 'yow'})});
        expect(bar.foo).toBeInstanceOf(Foo);
        expect(bar.foo.a).toBe('yow');
        expect(bar.path()('foo')('a')().get()).toBe('yow');
    });
});
