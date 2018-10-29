/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import './Node.css';
import {RefObject} from "react";
import Point, {IPoint} from "./Point";
import {DirectionProperty} from "csstype";
import {INode} from './store';

export interface NodeProps {
    readonly node: INode;
    readonly position: IPoint;
}

interface NodeState {
    readonly position: Point;
    readonly size: Point;
    readonly linkPoints: Connector[];
}

function num(str: string | number) {
    if (typeof str === 'number') {
        return str as number;
    }
    const match = /(-?\d*(?:\.\d*)?)(?:px)?/.exec(str);
    if (!match) {
        throw new Error(`Invalid length: ${str}`);
    }
    return Number(match[1] || 0);
}

export type NodeWatcher = (n: Node) => void;

export enum Direction {
    N, NE, E, SE, S, SW, W, NW,
}
const S2 = Math.sqrt(2);
function makeUVs() {
    const uv = new Array<Point>(8);
    uv[Direction.N] = new Point(0, 1);
    uv[Direction.NE] = new Point(S2, S2);
    uv[Direction.E] = new Point(1, 0);
    uv[Direction.SE] = new Point(S2, -S2);
    uv[Direction.S] = new Point(0, -1);
    uv[Direction.SW] = new Point(-S2, -S2);
    uv[Direction.W] = new Point(-1, 0);
    uv[Direction.NW] = new Point(-S2, S2);
    return Object.freeze(uv);
}
export namespace Direction {
    export const UV = makeUVs();
}

export class Connector {
    public readonly point: Point;
    public readonly dir: Direction;
    public readonly normal: Point;

    constructor(p: Point, d: Direction) {
        this.point = p;
        this.dir = d;
        this.normal = Direction.UV[d].mult(8);
    }
}


export default class Node extends React.Component<NodeProps, NodeState> {
    private readonly textRef: RefObject<SVGTextElement>;
    private readonly boxRef: RefObject<SVGRectElement>;
    private readonly outerRef: RefObject<SVGGElement>;
    private readonly watchers: NodeWatcher[] = [];

    constructor(props: NodeProps) {
        super(props);
        this.state = {
            position: new Point(props.position),
            size: new Point(0, 0),
            linkPoints: [new Connector(new Point(0, 0), Direction.N)],
        };
        this.textRef = React.createRef();
        this.boxRef = React.createRef();
        this.outerRef = React.createRef();
    }

    private onClick = () => alert(`click: ${this.props.node.id}`);

    public getPosition(): Point {
        return this.state.position;
    }

    /**
     * Get the displayed size of the node.
     */
    public getSize(): Point {
        return this.state.size;
    }

    /**
     * Compute the position to link to, given another node.
     * @param o
     */
    public getLinkPoint(o: Node): Connector {
        const p = this.getPosition();
        const op = o.getPosition();
        const conn = this.state.linkPoints
            .map(t => ({p: t, d: t.point.distance(op)}))
            .reduce((prev, cur) => ((cur.d < prev.d) ? cur : prev),
                {p: new Connector(p, Direction.N), d: p.distance(op)})
            .p;
        return conn;
    }

    /**
     * Add a [[Watcher]] to be notified of a change in [[Node]] state.
     * @param watcher The callback to be notified.
     */
    public watch(watcher: NodeWatcher) {
        this.watchers.push(watcher);
        watcher(this);
    }

    /**
     * Notify watchers of the change.
     */
    public componentDidUpdate() {
        this.watchers.forEach(cb => cb(this));
    }

    public componentDidMount() {
        const bbox = this.textRef.current.getBBox();
        const style = window.getComputedStyle(this.textRef.current);
        //
        const pLeft = num(style.getPropertyValue('padding-left'));
        const pRight = num(style.getPropertyValue('padding-right'));
        const pTop = num(style.getPropertyValue('padding-top'));
        const pBottom = num(style.getPropertyValue('padding-bottom'));
        //
        const height = pTop + pBottom + bbox.height;
        const width = pLeft + pRight + bbox.width;
        //
        this.outerRef.current.setAttribute('width', `${width}px`);
        this.outerRef.current.setAttribute('height', `${height}px`);
        this.outerRef.current.setAttribute('x', `${bbox.x}px`);
        this.outerRef.current.setAttribute('y', `${bbox.y}px`);
        //
        this.boxRef.current.setAttribute('width', `${width}px`);
        this.boxRef.current.setAttribute('height', `${height}px`);
        this.boxRef.current.setAttribute('x', `${bbox.x - pLeft}px`);
        //
        this.textRef.current.setAttribute('y', String(-  0.6 * bbox.height));
        const pos = this.getPosition();
        const obbox = this.boxRef.current.getBBox();
        this.setState({
            size: new Point(obbox.width, obbox.height),
            linkPoints: [
                new Connector(new Point(pos.x - obbox.width / 2, pos.y), Direction.W),
                new Connector(new Point(pos.x, pos.y - obbox.height / 2), Direction.S),
                new Connector(new Point(pos.x + obbox.width / 2, pos.y), Direction.E),
                new Connector(new Point(pos.x, pos.y + obbox.height / 2), Direction.N),
            ],
        });
    }

    public render() {
        const node = this.props.node;
        const state = this.state;
        const labels = (node.labels || [])
            .map(l => `U_${l}`)
            .join(' ');
        const tagset = node.tags;
        const tags = tagset && tagset.length
            ? ` [${node.tags.join(',')}]`
            : '';
        return (
            <g id={node.id}
               className={`Node ${labels}`}
            >
                {this.state.linkPoints.map(lp => <g>
                    <circle stroke="red" fill="transparent" r={3} cx={lp.point.x} cy={lp.point.y}/>
                </g>)}
                <g className="OuterBox"
                   ref={this.outerRef}
                   transform={`translate(${state.position.x}, ${state.position.y - state.size.y / 2})`}
                   onClick={this.onClick}
                   x={state.position.x} y={state.position.y}>
                    <rect className="Box" ref={this.boxRef} rx="0.4em" ry="0.4em"/>
                    <text className="Name" ref={this.textRef}
                    >{node && node.properties.name}{tags}</text>
                </g>
            </g>
        );
    }
}
