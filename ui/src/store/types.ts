/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {Map} from "immutable";
import {Nullable} from "../../../tools/util/types";
import {ActionType} from "typesafe-actions";
import {actions} from "./actions";
import Point from "../Point";
import {Connector} from "../tags/Node";
import {LinkState} from "../tags/Link";

export interface Meta {
    readonly source?: string;
    readonly skipStore?: boolean;
    readonly timestamp?: number;
    readonly [k: string]: any;
}

export interface ServerErrorMeta extends Meta {
    serverStack?: string;
}

export interface IAction<T extends string, P, M extends Meta = Meta> {
    type: T;
    payload: P;
    error?: Error;
    meta?: M;
}

/**
 * Things the user can click or press.
 */
export enum Clickables {
    keyboard = 'kbd',
    node = 'node',
    link = 'link',
    button = 'button',
    webLink = 'webLink',
    background = 'background',
}

export enum Modifier {
    none = '',
    control = 'c-',
    meta = 'm-',
    controlMeta = 'c-m-',
    shift = 'sh-',
    controlShift = 'c-sh-',
    metaShift = 'm-sh-',
    controlMetaShift = 'c-m-sh',
    super = 's-',
    conrolSuper = 'c-s-',
    metaSuper = 'm-s-',
    controlMetaSuper = 'c-m-s-',
    shiftSuper = 's-sh-',
    controlShiftSuper = 'c-sh-s-',
    metaShiftSuper = 'm-sh-s-',
    controlMetaShiftSuper = 'c-m-sh-s-',
}

export const modifiers: Modifier[] = [
    Modifier.none, Modifier.control, Modifier.meta, Modifier.controlMeta,
    Modifier.shift, Modifier.controlShift, Modifier.metaShift, Modifier.controlMetaShift,
    Modifier.super, Modifier.conrolSuper, Modifier.metaSuper, Modifier.controlMetaSuper,
    Modifier.shiftSuper, Modifier.controlShiftSuper, Modifier.metaShiftSuper, Modifier.controlMetaShiftSuper,
];

export interface ClickPayload {
    id: string;
    clicked: Clickables;
    modifier: Modifier;
    location?: Point;
}

export interface ConnectLinkRequest {
    link: string;
    from: string;
    to: string;
}

export interface ErrorBuilder<T extends string, P = null, M extends Meta = Meta> {
    (error: Error, meta?: M): IAction<T, P, M>;
    readonly tag: T;
}

export interface ActionBuilder<T extends string, P = null, M extends Meta = Meta> {
    (payload?: P, meta?: M): IAction<T, P, M>;
    error: ErrorBuilder<T, M>;
    readonly tag: T;
}

export interface INode {
    readonly id: string;
    readonly properties: {
        name: string;
        [n: string]: any;
    };
    readonly labels: string[];
    readonly tags: string[];
}

export interface ILink {
    readonly id: string;
    readonly properties: {
        name: string;
        [n: string]: any;
    };
    readonly from: string;
    readonly to: string;
    readonly type: string;
}

export interface JSONSuccess<T extends object = object> {
    readonly op: string;
    readonly payload: T;
}

export interface JSONFailure {
    readonly op: string;
    readonly error: string;
    readonly stack?: string;
}

export type JSONResponse<T extends object = object> = (JSONSuccess<T> | JSONFailure);
export function isJSONError<T extends object>(json: JSONResponse<T>): json is JSONFailure {
    return json.hasOwnProperty('error') && !!(json as JSONFailure).error;
}

export interface InitResponse {
    readonly title: string;
    readonly start: string;
    readonly nodes: Map<string, INode>;
    readonly links: Map<string, ILink>;
}


export interface NodeState {
    readonly position: Point;
    readonly size: Point;
    readonly linkPoints: Connector[];
    readonly node: INode;
}

export interface IView {
    nodes: Map<string, INode>;
    links: Map<string, ILink>;
    startNode?: string;
}

export interface ModelInterface {
    query(id: string): void;
}

export interface ErrorPayload {
    message: string;
    stack?: string;
}

export interface State {
    graph: {
        nodes: Map<string, INode>;
        links: Map<string, ILink>;
        startNode: string;
        connection: string;
    };
    ui: {
        title: string;
        loading: number;
        error: null | ErrorPayload;
        nodeStates: Map<string, NodeState>,
        linkStates: Map<string, LinkState>,
    };
}

export interface KeyedPayload<K extends string, T> {
    key: K;
    data: T;
}

export type ActionKeys<T = Action> = T extends {type: infer U} ? U : never;
export type PayloadFor<A, K> =
    A extends {type: K, payload: infer U}
        ? U
        : never;


export type Action = ActionType<typeof actions>;

// Utility

/**
 * Return the type of a [[Map]] type's key
 */
export type MapKey<M extends Map<any, any>> = M extends Map<infer U, any> ? U : never;

/**
 * Return the type of a [[Map]] type's value
 */
export type MapValue<M extends Map<any, any>> = M extends Map<any, infer U> ? U : never;

export type Nullable<T> = T | null;
