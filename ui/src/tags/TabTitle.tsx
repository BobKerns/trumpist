/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {connect} from "react-redux";
import {defaultMemoize} from "reselect";

export function TabTitle(props: {}) {
    return ReactDOM.createPortal(
        (props as any).children, // foo
        document.getElementsByTagName('title')[0],
    );
}

const mapStatetoProps = defaultMemoize((state: any) => ({children: state.ui.title}));

export const TabTitleR = connect(mapStatetoProps)(TabTitle);
