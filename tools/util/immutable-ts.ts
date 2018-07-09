/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as I from "immutable";
import {PathArray} from "./type-factory";

export {path, PathArray} from "./type-factory";

export {fromJS, is, hash, isImmutable, isCollection, isKeyed, isIndexed, isAssociative, isOrdered, isValueObject, get, has, remove, set, update, merge, mergeWith, mergeDeep, mergeDeepWith, Range, Repeat} from "immutable";

type Index = string | number;

export type ValueObject = I.ValueObject;

interface ModIn<R, C extends R> {
    hasIn<T>(keyPath: PathArray<R, T>): boolean;
    getIn<T>(keyPath: PathArray<R, T>): T;
    setIn<T>(keyPath: PathArray<R, T>, value: T): C;
    deleteIn<T>(keyPath: PathArray<R, T>): C;
    removeIn<T>(keyPath: PathArray<R, T>): C;
    updateIn<T>(keyPath: PathArray<R, T>, notSetValue: T, updater: (value: T) => T): C;
    updateIn<T>(keyPath: PathArray<R, T>, updater: (value: T) => T): C;
    mergeIn<T>(keyPath: PathArray<R, T>, ...collections: T[]): C;
    mergeDeepIn<T>(keyPath: PathArray<R, T>, ...collections: T[]): C;
}

interface ModRecord<T, W extends keyof T= never> {
    get<K extends keyof T>(key: K): T[K];
    set<K extends (keyof T) & W>(key: K, val: T[K]): Record<T, W>;
}

type Retype<R, IT, C extends R= R, S= never> = {
    [P in Exclude<Exclude<keyof C, ((keyof ModIn<R, C>) | (keyof S) | (keyof R))>, (keyof ModIn<R, C>)>]: C[P];
} & {
    readonly [N in (keyof C) & (keyof R)]: C[N];
} & {
    [Q in Exclude<keyof C, Exclude<keyof C, (keyof ModIn<R, C>)> | (keyof S)> & (keyof ModIn<R, C>)]: ModIn<R, C>[Q];
} & {
    [X in (keyof S) & (keyof C)]: S[X];
} & {
    [Symbol.iterator](): IterableIterator<IT>;
};

// export const Record: <TProps extends object, W>(defaultValues: TProps, name?: string) => Record.Factory<TProps, W> = I.Record;
export type Record<T, W extends keyof T= never, K extends keyof T= keyof T> = Retype<Readonly<T>, [K, T[K]], I.Record<T> & Readonly<T>, ModRecord<T, W>>;
export function Record<T, W extends keyof T= never>(defaults: T, name?: string): Record.Factory<T, W> {
    return I.Record<T>(defaults, name) as any as Record.Factory<T, W>;
}
export namespace Record {
    export namespace Factory {}

    export interface Factory<T,
        W extends keyof T= never,
        K extends keyof T = keyof T
        > {
        (values?: Partial<T>): Record<T, W>;
        new (values?: Partial<T>): Record<T, W>;
    }

    export function Factory<T extends object,
        W extends keyof T= never,
        K extends keyof T = keyof T
        >(values?: Partial<T>): Record<T, W> {
        return I.Record.Factory<T>(values as Partial<T>) as any as Record<T, W>;
    }
}
Record.prototype = I.Record.prototype;

export type List<T> = Retype<I.List<T>, T, never>;
export const List = I.List;

export type Map<K, V> = Retype<I.Map<K, V>, [K, V]>;
export const Map = I.Map;

export type OrderedMap<K, V> = Retype<I.OrderedMap<K, V>, [K, V]>;
export const OrderedMap: typeof I.OrderedMap = I.OrderedMap;

export type Set<V> = Retype<I.Set<V>, V>;
export const Set: typeof I.Set = I.Set;

export type OrderedSet<V> = Retype<I.OrderedSet<V>, V>;
export const OrderedSet = I.OrderedSet;

export type Stack<V> = Retype<I.Stack<V>, V>;
export const Stack = I.Stack;

export type Seq<K, V> = Retype<I.Seq<K, V>, [K, V]>;
export const Seq = I.Seq;

export type Collection<K, V> = I.Collection<K, V>;
export namespace Collection {
    export type Indexed<V> = Retype<I.Collection.Indexed<V>, V>;
    // export const Indexed = I.Collection.Indexed;
    import Indexed = I.Collection.Indexed;
    export type Keyed<K, V> = Retype<I.Collection.Keyed<K, V>, [K, V]>;
    export const Keyed = I.Collection.Keyed;
    // tslint:disable-next-line no-shadowed-variable
    export type Set<V> = Retype<I.Collection.Set<V>, V>;
    // tslint:disable-next-line no-shadowed-variable
    export const Set = I.Collection.Set;
}

interface getIn {
    (collection: any, keyPath: Iterable<any>, notSetValue: any): any;
    <C extends object, T>(collection: C, keyPath: PathArray<C, T>, notSetValue: T): T;
}
export const getIn: getIn = I.getIn;

interface setIn {
    <C>(collection: C, keyPath: Iterable<any>, value: any): C;
    <C extends object, T>(collection: C, keyPath: PathArray<C, T>, value: T): C;
}
export const setIn: setIn = I.setIn;

interface hasIn {
    (collection: any, keyPath: Iterable<any>): boolean;
    <C extends object, T>(collection: C, keyPath: PathArray<C, T>): boolean;
}
export const hasIn: hasIn = I.hasIn;

interface removeIn {
    <C>(collection: C, keyPath: Iterable<any>): C;
    <C extends object, T>(collection: C, keyPath: PathArray<C, T>): C;
}
export const removeIn: removeIn = I.removeIn;

interface updateIn {
    <C>(collection: C, keyPath: Iterable<any>, updater: (value: any) => any): C;
    <C extends object, T>(collection: C, keyPath: PathArray<C, T>, updater: (value: T) => T): C;
    <C>(collection: C, keyPath: Iterable<any>, notSetValue: any, updater: (value: any) => any): C;
    <C extends object, T>(collection: C, keyPath: PathArray<C, T>, notSetValue: T, updater: (value: T) => T): C;
}
export const updateIn: updateIn = I.updateIn;

export const Iterable = (I as any).Iterable;

export const version: any = (I as any).version;

export default {... exports};
