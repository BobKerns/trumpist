/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {IView as ModelBaseProps, ModelInterface, ROOT_VIEW, ViewOptions} from "../store";
import {ModelConnector} from "../model";
import {Store} from "redux";

export interface ModelProps {
    readonly viewId: string;
    readonly parent?: ModelConnector;
    readonly store: Store;
    readonly options?: ViewOptions;
    readonly children: (model: ModelInterface) => any;
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
        const options = {
            query: 'expand',
            ...props.options,
            parent: props.parent && props.parent.viewId,
        };
        this.model = new ModelConnector(this.viewId, options, props.store);
        this.model.onConnect();
    }

    public componentDidMount(): void {
        this.model.onConnect();
    }

    public componentWillUnmount() {
        this.model.onDestroy();
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

export default Model;
