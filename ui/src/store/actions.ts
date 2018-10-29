/*
 * Copyright (c) 2018 Bob Kerns.
 */

/**
 * Our actions.
 */
import {createStandardAction} from 'typesafe-actions';
import {INode, ILink, ActionBuilder} from './types';
import {string} from "prop-types";

// Graph actions
export const ADD_NODES = 'graph/addNodes';

export const ADD_LINKS = 'graph/addLinks';

export const SET_START = 'graph/setStart';

export const INIT_GRAPH = 'graph/init';

// UI actions
export const SET_TITLE = "ui/setTitle";

export const SET_LOADING = "ui/setLoading";

export const CLEAR_ERROR = "ui/clearError";

function action<T extends string>(type: T) {
    return <P, M = any>() =>
        createStandardAction(type)<P>() as ActionBuilder<T, P, M>;
}

export default {
    graph: {
        nodes: action(ADD_NODES)<INode[]>(),
        links: action(ADD_LINKS)<ILink[]>(),
        startNode: action(SET_START)<string>(),
        init: action(INIT_GRAPH)<undefined>(),
    },
    ui: {
        title: action(SET_TITLE)<string>(),
        loading: action(SET_LOADING)<boolean>(),
        clearError: action(CLEAR_ERROR)<undefined>(),
    },
};
