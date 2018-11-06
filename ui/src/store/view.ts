/*
 * Copyright (c) 2018 Bob Kerns.
 */



import {List, Map, Record} from "immutable";
import {IGraphCommon, ILink, INode} from "./types";
import {FilterName} from "../model/filters";
import {QueryName} from "../model/query";

export interface ViewOptions {
    startNode?: string;
    filter: FilterName;
    query: QueryName;
    parent?: string;
    [k: string]: string|number|boolean|Date;
}

export interface INodeLinks {
    up: List<string>;
    down: List<string>;
    left: List<string>;
    right: List<string>;
}

const defaultNodeLinks: INodeLinks = {
    up: List(), down: List(), left: List(), right: List(),
};

const NodeLinks = Record(defaultNodeLinks);
type NodeLinks = Record<INodeLinks>;
type ViewIndex = Map<string, NodeLinks>;

export interface IView {
    nodes: Map<string, INode>;
    links: Map<string, ILink>;
    index: ViewIndex;
    options: ViewOptions;
}

export function makeView(nodes: INode[], links: ILink[],
                         options: ViewOptions,
                         index?: ViewIndex): IView;
export function makeView(nodes: Map<string, INode>, links: Map<string, ILink>,
                         options: ViewOptions,
                         index?: ViewIndex): IView;
export function makeView(nodes: Map<string, INode>|INode[], links: Map<string, ILink>|ILink[],
                         options: ViewOptions,
                         index?: ViewIndex): IView {
    const toMap = <T extends IGraphCommon>(l: T[]): Map<string, T> => {
        return Map<string, T>().withMutations(m => {
            for (const i of l) {
                m.set(i.id, i);
            }
        });
    };
    if (Array.isArray(nodes) || Array.isArray(links)) {
        return makeView(toMap(nodes as INode[]), toMap(links as ILink[]), options, index);
    }
    if (!Map.isMap(nodes) || !Map.isMap(links)) {
        return makeView(Map(nodes), Map(links), options, index);
    }
    index = index || buildIndex(links as Map<string, ILink>);
    return {
        nodes, links, index, options,
    };
}

export const buildIndex = (links: Map<string, ILink>): Map<string, NodeLinks> => {
    const addLink = (l: ILink, n: Record<INodeLinks>, reverse: boolean) => {
        const key = l.properties.hierarchy
            ? (reverse ? 'up' : 'down')
            : (reverse ? 'left' : 'right');
        return  n.set(key, n.get(key).push(l.id));
    };
    return Map<string, NodeLinks>()
        .withMutations(i => {
            links.forEach((l, k) => {
                const from = i.get(l.from) || NodeLinks()
                    .withMutations(f => {
                        const to = i.get(l.to) || NodeLinks()
                            .withMutations(t => {
                                i.set(l.to, addLink(l, t, true));
                            });
                        i.set(l.from, addLink(l, f, false));
                    });
            });
        });
};
