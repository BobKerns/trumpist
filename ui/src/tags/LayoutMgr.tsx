/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {IView, LayoutMgrState, State} from "../store";
import {Map} from "immutable";
import Node from "./Node";
import Link from "./Link";
import Store from "./Store";
import Model from "./Model";
import Viewport from "./Viewport";
import {IPoint} from "../Point";
import {NodeType} from "../model/node-types";

export interface LayoutOptions {
    readonly nodeSize?: IPoint;
}

export interface LayoutMgrProps {
    readonly viewId: string;
    readonly center: IPoint;
    readonly options: LayoutOptions;
}

export class LayoutMgr extends React.Component<LayoutMgrProps, LayoutMgrState> {
    constructor(props: LayoutMgrProps) {
        super(props);
        this.state = {
            view: null,
            nodeState: Map(),
            linkState: Map(),
        };
    }

    public render() {
        let y = this.props.center.y || 0;
        let x = (this.props.center.x || 0) - 30;
        const nodeSize = this.props.options.nodeSize;
        const view = this.state.view;
        const nodes = view && view.nodes || Map();
        const links = view && view.links || Map();
        const anchor = view && view.nodes.get(view.options.startNode);
        const nodeList = [...nodes.keys()]
            .filter(k => k !== anchor.id)
            .map(k => {
                y -= 70;
                x += 25;
                const node = nodes.get(k);
                const nodeType = NodeType.type(node);
                const pos = {x, y};
                const size = nodeSize || nodeType.size(node);
                return {
                    position: pos,
                    size: nodeSize,
                    linkPoints: nodeType.connectors(node, pos, view),
                };
            });
        const linkList = [...links.keys()]
            .map(k => {
                const link = links.get(k);
                return <Link id={link.id} link={link} key={link.id}/>;
            });
        return (
            <g>
                {
                    anchor
                    && <Node id={anchor.id}
                             node={anchor}
                             key={anchor.id}
                             placement={{x: 0, y: 0}}
                             type={NodeType.type(anchor)}
                    />
                }
                {nodeList}
                {linkList}
                <circle radius={5} stroke="red" cx={0} cy={0}></circle>
            </g>
        );
    }
}
