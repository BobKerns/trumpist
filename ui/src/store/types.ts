/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {Map} from "immutable";
import {Nullable} from "../../../tools/util/types";
import {ActionType} from "typesafe-actions";
import actions from "./actions";

export interface Meta {
    readonly source?: string;
    readonly skipStore?: boolean;
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

export interface State {
    graph: {
        nodes: Map<string, INode>;
        links: Map<string, ILink>;
        startNode: string;
    };
    ui: {
        title: string;
        loading: number;
        error: Error;
    };
}

export type ActionKeys<T> = T extends {type: infer U} ? U : never;
export type PayloadFor<A, K> =
    A extends {type: K, payload: infer U}
        ? U
        : never;


export type Action = ActionType<typeof actions>;
