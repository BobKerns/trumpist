/*
 * Copyright (c) 2018 Bob Kerns.
 */


import {ID} from "./id-factory";
import {Constructor} from "../util/types";

import {Map, RecordOf, Record} from "immutable";

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
    readonly updateTime: Timestamp;
    readonly name: string;
}


interface BrainPropsCommon {
    readonly Id: UUID;
    readonly BrainId: UUID;
    readonly TypeId?: UUID;
    readonly Kind: number;
    readonly CreationDateTime: TimeString;
    readonly Name: string;
    readonly ModificationDateTime: TimeString;
}

const defaultCommonProps: BrainPropsCommon = {
    Id: "",
    BrainId: "",
    Kind: 0,
    CreationDateTime: "",
    Name: "",
    ModificationDateTime: "",
};

interface BrainNodeProps extends BrainPropsCommon {
    ThoughtIconInfo: string;
    ACType: number;
    Label?: string;
}

const defaultBrainNode: BrainNodeProps = {
    ...defaultCommonProps,
    ThoughtIconInfo: "",
    ACType: 0,
};

export const makeBrainNode = Record(defaultBrainNode);
export type BrainNode = RecordOf<BrainNodeProps>;

interface NodeProps extends Persisted<BrainNode> {
    brain?: BrainNode;
}

const defaultNode = {
    ...defaultBrainNode,
};

export const makeNode = Record(defaultNode);
export type Node = RecordOf<NodeProps>;

interface BrainLinkProps extends BrainPropsCommon {
    ThoughtIdA: UUID;
    ThoughtIdB: UUID;
    Relation: number;
    Direction: number;
    Meaning: number;
}

const defaultBrainLink: BrainLinkProps = {
    ...defaultCommonProps,
    ThoughtIdA: "",
    ThoughtIdB: "",
    Relation: 0,
    Direction: 0,
    Meaning: 0,
};

export const makeBrainLink = Record(defaultBrainLink);
export type BrainLink = RecordOf<BrainLinkProps>;

interface LinkProps extends Persisted<LinkType> {
    readonly from: Node;
    readonly to: Node;
    brain?: BrainLink;
}

const defaultLinkProps = {
    from: defaultNode,
    to: defaultNode,
};

export const makeLink = Record(defaultLinkProps);
export type Link = RecordOf<LinkProps>;

interface TypeProps<T= MetaType> extends Node {

}
const defaultTypeProps = {
    ...defaultNode
};

export const makeType = Record(defaultTypeProps);
export type Type<T= MetaType> = RecordOf<TypeProps<T>>

export interface NodeType extends Type<MetaType> {

}

export interface LinkType extends Type<MetaType> {

}

export interface MetaType extends Type<MetaType> {

}
