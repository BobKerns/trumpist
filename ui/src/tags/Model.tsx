/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {IView as ModelBaseProps} from "../store";

export interface ModelProps extends ModelBaseProps {
}

export interface ModelState {
}



class Model extends React.Component<ModelProps, ModelState> {
    constructor(props: ModelProps) {
        super(props);
    }

    public render() {
        return this.props.children;
    }
}
