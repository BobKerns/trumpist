/*
 * Copyright (c) 2018 Bob Kerns.
 */


import {ID} from "./id-factory";
import {Constructor} from "../util/types";
import {typeFactory} from "../util/type-factory";

type Timestamp = Date;
type UUID = string;
type TimeString = string;

function undef<T>(): T { return (undefined as any) as T; }

type WriteableProps = 'name' | 'label' | 'Name' | 'ModificationDateTime';

interface Persisted<T> {
    readonly id: ID;
    readonly type: T;
    readonly creationTime: Timestamp;
    readonly modificationTime: Timestamp;
    updateTime: Timestamp;
    name: string;
}


interface BrainPropsCommon {
    readonly Id: UUID;
    readonly BrainId: UUID;
    readonly TypeId?: UUID;
    readonly Kind: number;
    readonly CreationDateTime: TimeString;
    Name: string;
    ModificationDateTime: TimeString;
}

interface BrainNode extends BrainPropsCommon {
    ThoughtIconInfo: string;
    ACType: number;
    Label?: string;
}

export const BrainNode = typeFactory<BrainNode, WriteableProps>('BrainNode');

export interface Node extends Persisted<Node> {
    brain?: BrainNode;
}
export const Node = typeFactory<Node, WriteableProps>('Node');

interface BrainLink extends BrainPropsCommon {
    ThoughtIdA: UUID;
    ThoughtIdB: UUID;
    Relation: number;
    Direction: number;
    Meaning: number;
}

export const BrainLink = typeFactory<BrainLink, WriteableProps>('BrainLink');

export interface Link extends Persisted<LinkType> {
    readonly from: Node;
    readonly to: Node;
    brain?: BrainLink;
}

export const Link = typeFactory('Link');

export interface Type<T= MetaType> extends Node {

}

export const Type = typeFactory<Type>('Type');

export interface NodeType extends Type<MetaType> {

}

export interface LinkType extends Type<MetaType> {

}

export interface MetaType extends Type<MetaType> {

}
