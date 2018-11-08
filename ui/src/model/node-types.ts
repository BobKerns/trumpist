/*
 * Copyright (c) 2018 Bob Kerns.
 */


import {IPoint} from "../Point";
import {Direction} from "../tags/Node";
import {ICommonProperties, INode, IConnector} from "../store";


/**
 * A [NodeType] describes how a node should render. The [NodeType] selected may differ depending on the layout.
 */
export class NodeType<P = any, O = any> {
    public static type<P extends ICommonProperties>(node: INode<P>): NodeType<P> {
        return DEFAULT;
    }

    public size(node: INode): IPoint {
        return {
            x: 70,
            y: 15,
        };
    }
    public connectors(node: INode, position: IPoint, options: any): IConnector[] {
        const size = this.size(node);
        const dx = size.x / 2;
        const dy = size.y / 2;
        const {x, y} = position;
        return [
            {point: {x: x - dx, y}, dir: Direction.E, normal: Direction.UV[Direction.E].mult(8)},
        ];
    }
}


const DEFAULT: NodeType = new NodeType();
