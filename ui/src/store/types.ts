/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {Map} from "immutable";
import {Nullable} from "../../../tools/util/types";

export interface IAction<T extends string, P, M = any> {
    type: T;
    payload: P;
    error?: Error;
    meta?: M;
}

export interface ActionBuilder<T extends string, P = null, M = any> {
    (payload?: P, meta?: M): IAction<T, P, M>;
    type: T;
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
