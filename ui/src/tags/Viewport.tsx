/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {ReactNode} from "react";
import SvgDropShadow from "./SvgDropShadow";


export interface ViewProps {
    height: number | string;
    width: number | string;
}

export default function Viewport(props: ViewProps & {children?: ReactNode}) {
    return (
        <div style={{width: props.width, height: props.height}}>
            <svg width="100%" height="100%">
                <defs>
                    {
                        // Shadows available for use.
                    }
                    <SvgDropShadow id="dropshadowUP" offset={{x: -6, y: -12}}/>
                    <SvgDropShadow id="dropshadow" offset={{x: -1, y: -6}}/>
                    <SvgDropShadow id="dropshadow2" offset={{x: -2, y: -8}}/>
                </defs>
                <rect width={"100%"} height={"100%"} fill={"rgb(255, 240, 204)"}/>
                <g className="Translate">
                    <g className="FlipY">
                        {props.children}
                    </g>
                </g>
            </svg>
        </div>
    );
}
