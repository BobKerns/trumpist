/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {IView as ModelBaseProps, ModelInterface, ROOT_VIEW} from "../store";
import {ModelConnector} from "../model";
import {Store} from "redux";

export interface ModelProps {
    viewId: string;
    store: Store;
    children: (model: ModelInterface) => any;
}

export interface ModelState {
}

export const ModelContext = React.createContext<ModelInterface>(null);

class Model extends React.Component<ModelProps, ModelState> {
    private readonly model: ModelInterface;
    public readonly viewId: string;

    constructor(props: ModelProps) {
        super(props);
        this.viewId = props.viewId;
        this.model = new ModelConnector(this.viewId, null, props.store);
    }

    public render() {
        return (
            <ModelContext.Consumer>
                {
                    (parent) => {
                        return (
                            <ModelContext.Provider value={this.model}>
                                {this.props.children(this.model)}
                            </ModelContext.Provider>
                        );
                    }
                }
            </ModelContext.Consumer>
        );
    }
}
