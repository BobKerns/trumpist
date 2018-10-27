/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import Node, {INode} from './Node';
import Link, {ILink} from './Link';
import "./Graph.css";
import {Map} from 'immutable';

export interface GraphProps {
    anchor: INode;
    height: number | string;
    width: number | string;
    x?: number;
    y?: number;
    nodes: Map<string, INode>;
    links: Map<string, ILink>;
}

export default class Graph extends React.Component<GraphProps> {
    public render() {
        let y = this.props.y || 0;
        let x = (this.props.x || 0) - 30;
        const nodes = this.props.nodes;
        const links = this.props.links;
        const refs: {[k: string]: React.RefObject<Node>} = {};
        const nodeKeys = [...this.props.nodes.keys()];
        const anchor = this.props.anchor;
        const anchorRef = refs[anchor.id] = React.createRef();
        const nodeList = nodeKeys
            .filter(k => k !== anchor.id)
            .map(k => {
                y += 70;
                x += 25;
                const ref = React.createRef<Node>();
                refs[k] = ref;
                const node = nodes.get(k);
                return <Node node={node} key={node.id} position={{x, y}} ref={ref}/>;
            });
        const linkList = [...this.props.links.keys()]
            .map(k => {
                const link = links.get(k);
                const from = refs[link.from];
                const to = refs[link.to];
                return <Link link={link} key={link.id} from={from} to={to}/>;
            });
        return (
            <div style={{width: this.props.width, height: this.props.height}}>
                <svg width="100%" height="100%">
                    <rect width={"100%"} height={"100%"} fill={"yellow"}/>
                    <g className="Translate">
                            <g className="FlipY">
                            <Node node={anchor} key={anchor.id} position={{x: 0, y: 0}} ref={anchorRef}/>
                            {nodeList}
                            {linkList}
                            <circle radius={5} stroke="red" cx={0} cy={0}></circle>
                        </g>
                    </g>
                </svg>
            </div>
        );
    }
}
