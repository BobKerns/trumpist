/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import Node from './Node';
import Link from './Link';
import {ILink, INode} from '../store';
import "../css/Graph.css";
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
        const nodeKeys = [...this.props.nodes.keys()];
        const anchor = this.props.anchor;
        const nodeList = nodeKeys
            .filter(k => k !== anchor.id)
            .map(k => {
                y -= 70;
                x += 25;
                const node = nodes.get(k);
                return <Node id={node.id} node={node} key={node.id} placement={{x, y}}/>;
            });
        const linkList = [...this.props.links.keys()]
            .map(k => {
                const link = links.get(k);
                return <Link id={link.id} link={link} key={link.id}/>;
            });
        return (
            <div style={{width: this.props.width, height: this.props.height}}>
                <svg width="100%" height="100%">
                    <defs>
                        <filter id="dropshadowUP" height="170%">
                            <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                            <feOffset dx="-6" dy="-12" result="offsetblur"/>
                            <feComponentTransfer>
                                <feFuncA type="linear" slope="0.2"/>
                            </feComponentTransfer>
                            <feMerge>
                                <feMergeNode/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    <filter id="dropshadow" height="170%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                        <feOffset dx="-1" dy="-6" result="offsetblur"/>
                        <feComponentTransfer>
                            <feFuncA type="linear" slope="0.2"/>
                        </feComponentTransfer>
                        <feMerge>
                            <feMergeNode/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                        <filter id="dropshadow2" height="170%">
                            <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                            <feOffset dx="-2" dy="-8" result="offsetblur"/>
                            <feComponentTransfer>
                                <feFuncA type="linear" slope="0.2"/>
                            </feComponentTransfer>
                            <feMerge>
                                <feMergeNode/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                </defs>
                    <rect width={"100%"} height={"100%"} fill={"yellow"}/>
                    <g className="Translate">
                        <g className="FlipY">
                            {
                                anchor
                                && <Node id={anchor.id}
                                         node={anchor}
                                         key={anchor.id}
                                         placement={{x: 0, y: 0}}
                                />
                            }
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
