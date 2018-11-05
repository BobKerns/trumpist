/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {connect} from "react-redux";
import {actions} from "../store";

export interface ErrorProps {
    message: string;
    stack?: string;
    dispatch?: (a: any) => any;
}

export class ErrorPopup extends React.Component<ErrorProps> {
    constructor(props: ErrorProps) {
        super(props);
    }

    public render() {
        const props = this.props;
        if (props.message) {
            return (
                <div className="Error" onClick={() => props.dispatch(actions.ui.clearError())}>
                    <b>{this.props.message}</b>
                    <div className="Stack">{this.props.stack}</div>
                </div>
            );
        } else {
            return null;
        }
    }
}

function mapStateToProps(state: any) {
    if (state.ui.error) {
        return {
            message: state.ui.error.message,
        };
    } else {
        return {};
    }
}

const ErrorPopupR = connect(mapStateToProps)(ErrorPopup);
export default ErrorPopupR;

