/*
 * Copyright (c) 2018 Bob Kerns.
 */


import {Constructor, never} from "./types";
import {clone, reduceRight} from "ramda";

export interface Accessors<T, W extends string= never> {
    get<K extends keyof this>(key: K): this[K];
    set<K extends W & keyof this>(key: K, val: this[K]): this;
    set<K extends W & keyof this>(key: K, val: this[K]): this;
    // path<K extends keyof this>(): PathStep<this>;
}

function hasPath(v: any): v is Props<any> {
    return typeof v === 'object' && Reflect.has(v, 'path');
}

abstract class Props<T, W extends string= never> extends Object {
    protected constructor(vals: T) {
        super();
        Object.assign(this, vals);
    }
    public get<K extends keyof this>(key: K): this[K] { return this[key]; }
    public set<K extends W & keyof this>(key: K, val: this[K]): this {
        const obj: any = Object.assign({}, this);
        obj[key] = val;
        Reflect.setPrototypeOf(obj, Object.getPrototypeOf(this));
        return obj;
    }
}

export function typeFactory<T, W extends string= never>(name: string, supertype: any= Props) {
    const sproto = typeof supertype === 'function' ? supertype.prototype : (supertype || Props.prototype);
    const proto = Object.create(sproto);
    function c(props: T) {
        const obj = Object.create(proto);
        Object.assign(obj, props);
        return obj;
    }
    Reflect.defineProperty(c, 'name', { writable: true });
    (c as any).name = name;
    Reflect.defineProperty(c, 'name', { writable: false });
    Reflect.defineProperty(proto, 'constructor', {
        value: c,
        enumerable: false,
    });
    c.prototype = proto;
    return c as any as new (params: T) => (T & Accessors<T, W>);
}

type Index = string | number;

export type ReduceFn<A, K extends Index, V= any, O= any> = (accumulator: A, key: K, value: V, obj: O) => A;
type Reducer<O> = <A>(fn: ReduceFn<A, Index, undefined, Path<O, any>>,
                      accumulator: A | undefined,
                      pathObj: Path<O, any>)
    => A;

export interface PathStep<O, T> {
    <K extends keyof T= keyof T>(key: K): (K extends (string  | number) ? PathStep<O, T[K]> : never);
    (): Path<O, T>;
}

export interface Path<F, T> {
    readonly path: Index[];
    (obj: F): BoundPath<F, T>;
    get(): (obj: F) => T;
    set(value: T): (obj: F) => F;
    set(): (obj: F) => (val: T) => F;
}

function cloneIf<P extends object, K extends Index, V>(parent: P, key: K, oldVal: V, newVal: V): P {
    if (Object.is(oldVal, newVal)) {
        return parent;
    } else if (Array.isArray(parent)) {
        const copy = [...parent];
        copy[key as number] = newVal;
        return copy as P;
    } else {
        const copy = {...(parent as object), [key]: newVal};
        Reflect.setPrototypeOf(copy, Reflect.getPrototypeOf(parent));
        return copy as P;
    }
}

/**
 * Make all properties in T writeable
 */
type Writeable<T> = {
    -readonly [P in keyof T]: T[P];
};

const DEFAULTED = Object.freeze({default: 'DEFAULTED'});
const DEFAULT = <V>(): V => DEFAULTED as any as V;

function makeInterface<I extends object>(f: (...a: any[]) => any, initFn: (iface: Writeable<I>) => any) {
    const handler: ProxyHandler<I> = {
        set: (target: I, key: string, value: any) => {
            return Reflect.defineProperty(target, key, {
                value: value,
                enumerable: false,
                configurable: false,
                writable: false,
            });
        },
    };
    initFn(new Proxy(f as I, handler));
    return f as I;
}

function makePath<F extends object, T>(left: Reducer<F>, right: Reducer<F>): Path<F, T> {
    // tslint:disable no-shadowed-variable
    const pathFn: Path<F, T> = (function Path(obj: F) {
        return makeBoundPath(pathFn, obj);
    }) as Path<F, T>;
    return makeInterface<Path<F, T>>(pathFn, def => {
        def.path = left<Index[]>((ac, key) => [...ac, key], [], pathFn);
        def.get = () => right<(o: any) => any>((fn, key) => (fn
            ? (o: any) => fn(o[key])
            : (o: any) => o[key]),
            (o: any) => o, pathFn);
        const set0 = (v: T) => right((fn, key) => (p: any) => cloneIf(p, key, p[key], fn(p[key])),
            ((fpp?: any) => v as T),
            pathFn);

        function set(): (obj1: F) => (val: T) => F;
        function set(): (obj1: F) => F;
        function set(val: T = DEFAULT()): (((obj1: F) => F) | ((obj1: F) => (val: T) => F)) {
            return Object.is(val, DEFAULTED)
                ? ((obj: F) => (val: T) => (set0(val)(obj) as any as F))
                : ((obj: F) => (set0(val)(obj) as any as F));
        }
        def.set = set;
    });
    return pathFn;
}

export interface BoundPath<F, T> {
    readonly path: Index[];
    (): T;
    get(): T;
    set(value: T): F;
}

function makeBoundPath<F, T>(path: Path<F, T>, obj: F): BoundPath<F, T> {
    const bpath: BoundPath<F, T> = (function BoundPath(): T {
        return path.get()(obj);
    }) as BoundPath<F, T>;
    makeInterface<BoundPath<T, F>>(bpath, def => {
    });
    return bpath;
}

export function path<O extends object>(): PathStep<O, O> {
    const endReducer: Reducer<O> =
        <A>(fn: ReduceFn<A, Index, undefined, Path<O, any>>, value: A | undefined, pathobj: Path<O, any>) => value!;
    function build<F, T>(
        left: Reducer<O>,
        right: Reducer<O>):
        PathStep<O, T> {
        function step<K extends keyof T= keyof T>(key: K): PathStep<O, T[K]>;
        function step(): Path<O, T>;
        function step<K extends keyof T= keyof T>(key?: K): PathStep<O, T[K]> | Path<O, T> {
            switch (typeof key) {
                case 'undefined':
                    return makePath<O, T>(left, right);
                case 'string':
                case 'number': {
                    const nLeft = <A>(fn: ReduceFn<A, Index, undefined, Path<O, any>>,
                                      accumulator: A | undefined,
                                      pathObj: Path<O, T>) =>
                        fn(left(fn, accumulator, pathObj), key as Index, undefined, pathObj);
                    const nRight = <A>(fn: ReduceFn<A, Index, undefined, Path<O, any>>,
                                       accumulator: A | undefined,
                                       pathObj: Path<O, T>)  =>
                        right(fn, fn(accumulator!, key as Index, undefined, pathObj), pathObj);
                    const pstep = build<T, T[K]>(nLeft, nRight);
                    (pstep as any).key = key;
                    return pstep;
                }
                default:
                    return never(`Illegal value passed to path: ${key}.`);
            }
        }

        return step as any as PathStep<O, T>;
    }
    return build<O, O>(endReducer, endReducer);
}

