/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import './Node.css';
import {RefObject} from "react";

export interface INode {
    readonly id: string;
    readonly title: string;
}

interface NodeProps {
    readonly node: INode;
    readonly x: number;
    readonly y: number;
}

interface NodeState {
    readonly x: number;
    readonly y: number;
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

export default class Node extends React.Component<NodeProps, NodeState> {
    private textRef: RefObject<SVGTextElement>;
    private boxRef: RefObject<SVGRectElement>;
    private outerRef: RefObject<SVGGElement>;
    constructor(props: NodeProps) {
        super(props);
        this.state = {x: props.x || 0, y: props.y || 0};
        this.textRef = React.createRef();
        this.boxRef = React.createRef();
        this.outerRef = React.createRef();
    }

    onClick = () => alert(`click: ${this.props.node.id}`);

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
        this.textRef.current.setAttribute('y', String(bbox.height));

    }

    public render() {
        const node = this.props.node;
        const state = this.state;
        return (
            <g id={node.id} className="Node S_Gov"
               onClick={this.onClick}
               ref={this.outerRef}
               transform={`translate(${state.x}, ${state.y})`}
               x={state.x} y={state.y}>
                <rect className="Box" ref={this.boxRef} rx="0.4em" ry="0.4em"/>
                <text className="Name" ref={this.textRef}>{this.props.node.title}</text>
            </g>
        );
    }
}
