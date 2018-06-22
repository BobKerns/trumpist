/*
 * Copyright (c) 2018 Bob Kerns.
 */


import {Record} from "immutable";
import {ID} from "./id-factory";
import {Constructor} from "../util/types";

type Timestamp = Date;

type XPick<T, K extends keyof T> = {
    [P in K]: T[P];
};

export type SetterNames = 'set' | 'setIn' | 'update' | 'updateIn'
    | 'merge' | 'mergeDeep' | 'mergeWith'
    | 'remove' | 'delete';
export type NoSetters<C extends Constructor<any>,
    K extends SetterNames= SetterNames,
    I extends InstanceType<C>= InstanceType<C>>
    = XPick<I, Exclude<keyof I, K>>;

/**
 * A partial replacement for the setters we remove.
 */
export interface Setters<W, V= keyof W> {
    set<K extends V & keyof W>(k: K, v: W[K]): this;
    update<K extends V & keyof W>(key: K, updater: (value: W[K]) => W[K]): this;
    merge(...collections: Array<Partial<V> | Iterable<[V, any]>>): this;
    mergeWith(merger: (oldVal: any, newVal: any, key: keyof V) => any,
              ...collections: Array<Partial<V> | Iterable<[string, any]>>): this;
}

function undef<T>(): T { return (undefined as any) as T; }

interface Persisted_R<T> {
    readonly id: ID;
    readonly type: T;
    readonly creationTime: Timestamp;
    readonly modificationTime: Timestamp;
}
const Persisted_R: Persisted_R<NodeType> = {
    id: undef(),
    type: undef(),
    creationTime: undef(),
    modificationTime: undef(),
};


interface Persisted_W {
    name: string;
}
const Persisted_W: Persisted_W = {
    name: undef(),
};

export interface Persisted<T> extends Persisted_W, Persisted_R<T> {
}
export const Persisted: Persisted<Type<any>> = { ...Persisted_W, ...Persisted_R };

interface BrainPropsCommon_R {
    readonly brain_Id: string;
    readonly brain_BrainId: string;
    readonly brain_Kind: number;
    readonly brain_CreationDateTime: string;
}
const BrainPropsCommon_R: BrainPropsCommon_R = {
    brain_Id: undef(),
    brain_BrainId: undef(),
    brain_Kind: undef(),
    brain_CreationDateTime: undef(),
};

interface BrainPropsCommon_W {
    brain_Name: string;
    brain_ModificationDateTime: string;
}
const BrainPropsCommon_W: BrainPropsCommon_W = {
    brain_Name: undef(),
    brain_ModificationDateTime: undef(),
};

export interface BrainPropsCommon extends BrainPropsCommon_R, BrainPropsCommon_W {
}
export const BrainPropsCommon: BrainPropsCommon = { ...BrainPropsCommon_R, ...BrainPropsCommon_W };

interface BrainNodeProps_R extends BrainPropsCommon_R {
}
const BrainNodeProps_R: BrainNodeProps_R = { ...BrainPropsCommon_R };

interface BrainNodeProps_W extends BrainPropsCommon_W {
    brain_ThoughtIconInfo: string;
    brain_ACType: number;
    brain_Label?: string;
}
const BrainNodeProps_W: BrainNodeProps_W = {
    ...BrainPropsCommon_W,
    brain_ThoughtIconInfo: undef(),
    brain_ACType: 9,
    brain_Label: undef(),
};

export interface BrainNodeProps extends BrainNodeProps_R, BrainNodeProps_W {
}
export const BrainNodeProps: BrainNodeProps = { ...BrainNodeProps_R, ...BrainNodeProps_W };

const BrainNodeBase: Record.Factory<BrainNodeProps> = Record(BrainNodeProps);
export type BrainNodeSettings = NoSetters<typeof BrainNodeBase> & Setters<BrainNodeProps_W>;
export const BrainNodeSettings = BrainNodeBase;


interface Node_W extends Persisted_W {
    brain?: BrainNodeSettings;
}

const Node_W: Node_W = {
    ...Persisted_W,
    brain: undef(),
};

interface Node_R extends Persisted_R<NodeProps> {
}
const Node_R: Node_R = { ...Persisted_R };

export interface NodeProps extends Node_R, Node_W {
}
export const NodeProps: NodeProps = { ...Node_R, ...Node_W };
const NodeBase: Record.Factory<NodeProps> = Record(NodeProps);
export type Node = NoSetters<typeof NodeBase> & Setters<Node_W>;
export const Node = NodeBase;

export interface Link extends Persisted<NodeType> {
    readonly from: Node;
    readonly to: Node;
}


export interface Type<T= MetaType> extends Node {

}

export interface NodeType extends Type<MetaType> {

}

export interface LinkType extends Type<MetaType> {

}

export interface MetaType extends Type<MetaType> {

}
