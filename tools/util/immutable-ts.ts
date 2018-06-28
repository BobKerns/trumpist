/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as I from "immutable";
import {PathArray} from "./type-factory";

export {fromJS, is, hash, isImmutable, isCollection, isKeyed, isIndexed, isAssociative, isOrdered, isValueObject, get, has, remove, set, update, merge, mergeWith, mergeDeep, mergeDeepWith, Range, Repeat} from "immutable";

type Index = string | number | Symbol;

export type ValueObject = I.ValueObject;

interface ModIn {
    hasIn<T>(keyPath: PathArray<this, T>): boolean;
    hasIn(keyPath: Iterable<Index>): boolean;
    getIn<T>(keyPath: PathArray<this, T>): T;
    getIn(keyPath: Iterable<Index>): any;
    setIn<T>(keyPath: PathArray<this, T>, value: T): this;
    setIn<T>(keyPath: Iterable<Index>, value: any): this;
    deleteIn<T>(keyPath: PathArray<this, T>): this;
    deleteIn(keyPath: Iterable<Index>): this;
    removeIn<T>(keyPath: PathArray<this, T>): this;
    removeIn(keyPath: Iterable<Index>): this;
    updateIn<T>(keyPath: PathArray<this, T>, notSetValue: T, updater: (value: T) => T): this;
    updateIn<V>(keyPath: Iterable<Index>, notSetValue: V, updater: (value: V) => V): this;
    updateIn<T>(keyPath: PathArray<this, T>, updater: (value: T) => T): this;
    updateIn<V>(keyPath: Iterable<Index>, updater: (value: V) => V): this;
    mergeIn<T>(keyPath: PathArray<this, T>, ...collections: T[]): this;
    mergeIn<V>(keyPath: Iterable<Index>, ...collections: V[]): this;
    mergeDeepIn<T>(keyPath: PathArray<this, T>, ...collections: T[]): this;
    mergeDeepIn<V>(keyPath: Iterable<Index>, ...collections: V[]): this;
}

interface ModRecord<W= never> {
    get<K extends keyof this>(key: K): this[K];
    set<K extends keyof this & W>(key: K, val: this[K]): this;
}

type Retype<C, IT> = {
    [P in Exclude<keyof C, keyof ModIn>]: C[P];
} & {
    [Q in Exclude<keyof C, Exclude<keyof C, keyof ModIn>> & keyof ModIn]: ModIn[Q];
} & {
    [Symbol.iterator](): IterableIterator<IT>;
} & (() => C);

export type List<T> = Retype<I.List<T>, T>;
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
