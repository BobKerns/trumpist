/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as React from 'react';
import {RefObject} from 'react';
import Node, {Connector, Direction} from './Node';
import '../css/Link.css';
import Point from "../Point";
import {ILink} from '../store';

export const DEFAULT_CURVINESS = 120;

export interface LinkProps {
    readonly link: ILink;
    readonly from: RefObject<Node>;
    readonly to: RefObject<Node>;
    readonly curviness?: number;
}

interface LinkState {
    from: Connector;
    to: Connector;
}

export default class Link extends React.Component<LinkProps, LinkState> {
    constructor(props: LinkProps) {
        super(props);
        const dummy = new Connector(new Point(0, 0), Direction.S);
        this.state = {
            from: dummy,
            to: dummy,
        };
    }

    private onClick = () => alert(`click: ${this.props.link.id}`);

    public componentDidMount() {
        const fromNode = this.props.from.current;
        const toNode = this.props.to.current;
        fromNode.watch(f => this.setState({from: f.getLinkPoint(toNode)}));
        toNode.watch(t => this.setState({to: t.getLinkPoint(fromNode)}));
    }

    public render() {
        const from = this.state.from;
        const to = this.state.to;
        const curviness = (this.props.curviness || DEFAULT_CURVINESS) * this.state.from.point.distance(this.state.to.point) / 200;
        const df = Direction.UV[from.dir].mult(curviness).add(from.point);
        const dt = Direction.UV[to.dir].mult(curviness).add(to.point);
        const mid = from.point.add(to.point).mult(0.5);
        return (
            <g className={`Link ${this.props.link.type || 'PLAIN'}`}
               onClick={this.onClick}
            >
                <text x={mid.x} y={-mid.y}>{this.props.link.properties.name || this.props.link.type}</text>
            <path
                d={`M ${from.point.x} ${from.point.y} C ${df.x} ${df.y} ${dt.x} ${dt.y} ${to.point.x} ${to.point.y}`}
                fill="transparent"></path> </g>
        );
    }
}