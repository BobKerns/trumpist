/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {buildIndex, ILink, INode, IView, makeView, ViewOptions} from "../store";
import {Map, is} from "immutable";
import {string} from "prop-types";

const buildView = (nodes: Map<string, INode>, links: Map<string, ILink>, view: IView, parent: IView): IView => {
    const sameNodes = view && is(nodes, view.nodes);
    const sameLinks = view && is(links, view.links);
    if (sameNodes && sameLinks) {
        return view;
    }
    const parentNodes = parent && !sameNodes && is(nodes, parent.nodes);
    const parentLinks = parent && !sameLinks && is(links, parent.links);
    if (parentNodes && parentLinks) {
        return parent;
    }
    const newNodes = (sameNodes && view.nodes) || (parentNodes && parent.nodes) || nodes;
    const newLinks = (sameLinks && view.links) || (parentLinks && parent.links) || links;
    const newIndex = (sameLinks && view.index) || (parentLinks && parent.index) || buildIndex(links);
    const newStartNode = (view.options.startNode && nodes.get(view.options.startNode) && view.options.startNode)
        || (parent.options.startNode && nodes.get(parent.options.startNode) && parent.options.startNode);
    const options = view ? view.options : DEFAULT_OPTIONS;
    const start = newStartNode ? {start: newStartNode} : {};
    return makeView(nodes, links, {...options, ...start});
};

export type ViewFilter = (view: IView, parent: IView, params: object) => IView;

const linkFilter = (filter: (parent: IView) => (link: ILink) => boolean) =>
    (view: IView, parent: IView, params: ViewOptions): IView => {
        const pred = filter(parent);
        const src = parent.nodes;
        const nodes: {[k: string]: INode} = {};
        const links = parent.links
            .filter((l, key, iter) => pred(l));
        links.forEach((val, key, iter) => {
            nodes[val.from] = src.get(val.from);
        });
        return buildView(Map<INode>(nodes), links, view, parent);
    };

export interface NeighborParams {
    depth: number | {left: number, right: number, up: number, down: number};
}

export const DEFAULT_OPTIONS: ViewOptions = {
    filter: 'identity',
    query: 'expand',
};

const EMPTY_VIEW: IView = {nodes: Map(), links: Map(), index: Map(), options: DEFAULT_OPTIONS};

/*
const neighbors: ViewFilter = (view: IView, parent: IView, {depth}: NeighborParams) => {
    const left = typeof depth === 'number' ? depth : depth.left;
    const right = typeof depth === 'number' ? depth : depth.left;
    const up = typeof depth === 'number' ? depth : depth.left;
    const down = typeof depth === 'number' ? depth : depth.left;
    const start = view.options.startNode || parent.options.startNode;
    const root = parent.nodes.get(start);
    if (!root) {
        return EMPTY_VIEW;
    }
    const nodeLinks: {[k: string]: {left: ILink}} = {[start]: 0};
    const recurse = ()
};
*/

export const filters = {
    identity(view: IView, parent: IView, options: ViewOptions) { return parent; },
    hierarchy: linkFilter(() => (l: ILink) => l.properties.hierarchy),
    lateral: linkFilter(() => (l: ILink) => !l.properties.hierarchy),
    // neighbors,
};

export type FilterName = keyof typeof filters;
