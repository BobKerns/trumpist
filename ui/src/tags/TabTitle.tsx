/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {connect} from "react-redux";
import {defaultMemoize} from "reselect";
import {State} from "../store";

const title = document.getElementsByTagName('title')[0];
title.text = '';

export function TabTitle(props: {}) {
    return ReactDOM.createPortal(
        (props as any).children,
        title,
    );
}

// const mapStatetoProps = defaultMemoize((state: State) => ({children: state.ui.title}));
const mapStatetoProps = (state: State) => ({children: state.ui.title});

export const TabTitleR = connect(mapStatetoProps)(TabTitle);
