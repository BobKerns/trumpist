/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {IPoint} from "../Point";

export interface IShadowProps {
    id: string;
    offset: IPoint;
}

export default function SvgDropShadow(props: IShadowProps) {
    return (
        <filter id={props.id} height="170%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
            <feOffset dx={props.offset.x} dy={props.offset.y} result="offsetblur"/>
            <feComponentTransfer>
                <feFuncA type="linear" slope="0.2"/>
            </feComponentTransfer>
            <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>
    );
}
