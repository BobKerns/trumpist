/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as React from 'react';
import {Dispatch} from "redux";
import {connect} from "react-redux";
import Node, {Connector, Direction} from './Node';
import '../css/Link.css';
import Point from "../Point";
import {Action, actions, bindActions, ILink, NodeState, Nullable} from '../store';
export const DEFAULT_CURVINESS = 120;

export interface LinkProps {
    readonly id: string;
    readonly link: ILink;
    readonly curviness?: number;
    readonly dispatch?: Dispatch;
}

interface LinkNodeData<T> {
    from: T;
    to: T;
}

export interface LinkState {
    nodes: LinkNodeData<NodeState>;
    connectors: LinkNodeData<Connector>;
}

export class BaseLink extends React.Component<LinkProps, LinkState> {
    constructor(props: LinkProps) {
        super(props);
        this.state = {
            nodes: {
                from: null,
                to: null,
            },
            connectors: {
                from: null,
                to: null,
            },
        };
    }

    private onClick = () => alert(`click: ${this.props.link.id}`);


    /**
     * Compute the position to link to, given another node.
     * @param o
     */
    private getLinkPoint(tNode: NodeState, oNode: NodeState): Connector {
        const op = oNode.position;
        const p = tNode.position;
        const conn = tNode.linkPoints
            .map(t => ({p: t, d: t.point.distance(op)}))
            .reduce((prev, cur) => ((cur.d < prev.d) ? cur : prev),
                {p: new Connector(p, Direction.N), d: p.distance(op)})
            .p;
        return conn;
    }

    private updateEndpoints(old: LinkState, state: LinkState) {
        const fromNode = this.state.nodes.from;
        const toNode = this.state.nodes.to;
        if (fromNode && toNode) {
            const from = this.getLinkPoint(fromNode, toNode);
            const to = this.getLinkPoint(toNode, fromNode);
            if ((from !== this.state.connectors.from)
                && (to !== this.state.connectors.to)) {
                this.setState({
                    connectors: {
                        from: from,
                        to: to,
                    },
                });
            }
        }
    }

    private dispatch(action: Action) {
        const props: any = this.props;
        const dispatch = props.dispatch as Nullable<Dispatch>;
        if (dispatch) {
            dispatch(action);
        }
    }

    public componentDidMount() {
        this.dispatch(actions.ui.connectLink({
            link: this.props.id,
            from: this.props.link.from,
            to: this.props.link.to,
        }));
    }

    public render() {
        const from = this.state.connectors.from;
        const to = this.state.connectors.to;
        if (!from || !to) {
            // Can't render yet.
            return null;
        }
        const curviness = (this.props.curviness || DEFAULT_CURVINESS) * from.point.distance(to.point) / 200;
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

const Link = connect(null, null)(BaseLink);
export default Link;
