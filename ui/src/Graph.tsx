/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import Node, {INode} from './Node';
import "./Graph.css";

export interface GraphProps {
    anchor: INode;
    height: number | string;
    width: number | string;
}

export default class Graph extends React.Component<GraphProps> {
    public render() {
        return (
            <div style={{width: this.props.width, height: this.props.height}}>
                <svg width="100%" height="100%">
                    <rect width={"100%"} height={"100%"} fill={"yellow"}/>
                    <g className="Translate">
                        <Node node={this.props.anchor} x={0} y={0}/>
                    </g>
                </svg>
            </div>
        );
    }
}
