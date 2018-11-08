/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import Node from './Node';
import Link from './Link';
import {ILink, INode, IView} from '../store';
import "../css/Graph.css";
import {Map} from 'immutable';
import Viewport from "./Viewport";
import Model from "./Model";
import Store from "./Store";
import {LayoutMgr, LayoutOptions} from "./LayoutMgr";
import {IPoint} from "../Point";

export interface GraphProps {
    center: IPoint<number>;
    size: IPoint<string|number>;
    viewId: string;
    options: LayoutOptions;
}

export default class Graph extends React.Component<GraphProps> {
    public render() {
        const center = this.props.center;
        const viewId = this.props.viewId;
        const size = this.props.size;
        return (
            <Store.Consumer>{
                store => {
                    return (
                        <Model viewId={viewId} store={store}>{
                            model => {
                                return (
                                    <Viewport size={size}>
                                        <LayoutMgr viewId={viewId} options={{}} center={center}/>
                                    </Viewport>
                                );
                            }
                        }</Model>
                    );
                }
            }</Store.Consumer>
        );
    }
}
