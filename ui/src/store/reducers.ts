/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {ActionKeys, IAction, PayloadFor} from './types';
import {combineReducers} from 'redux';
import {Map} from 'immutable';
import {INode, ILink, State} from "./types";
import {ActionType, StateType} from "typesafe-actions";
import actions from './actions';
import {DeepReadonly} from "utility-types";

const {ui, graph} = actions;

export type Action = ActionType<typeof actions>;

function doGraphNodes(state: Map<string, INode> = Map<string, INode>(), action: Action) {
    switch (action.type) {
        case graph.addNodes.type:
            return action.payload.reduce((s, v) => s.set(v.id, v), state);
        default:
            return state;
    }
}

function doGraphLinks(state: Map<string, ILink> = Map<string, ILink>(), action: Action) {
    switch (action.type) {
        case graph.addLinks.type:
            return action.payload.reduce((s, v) => s.set(v.id, v), state);
        default:
            return state;
    }
}


/**
 * Generalized setter
 * @param actType
 * @param dflt Default/initial value
 * @returns {Function}
 */
function setter<T extends PayloadFor<Action, K>, K extends ActionKeys<Action>>(actType: K, dflt: T) {
    return (state: T, action: Action): T => {
        switch (action.type) {
            case actType:
                if (action.payload === undefined) {
                    return state || dflt;
                }
                return action.payload as T;
            default:
                return state || dflt;
        }
    };
}

function doLoading(state: number = 0, action: Action) {
    switch (action.type) {
        case ui.setLoading.type:
            if (action.payload) {
                return state + 1;
            } else {
                return state - 1;
            }
        default:
            return state;
    }
}

function doError(state: Error|null = null, action: Action) {
    switch (action.type) {
        case ui.clearError.type:
            return null;
        default:
            return action.error || state;
    }
}

export const doState = combineReducers<State, Action>({
    graph: combineReducers({
        nodes: doGraphNodes,
        links: doGraphLinks,
        startNode: setter(graph.setStartNode.type, "foo"),
    }),
    ui: combineReducers({
        title: setter(ui.setTitle.type, "Unknown"),
        loading: doLoading,
        error: doError,
    }),
});

export default doState;
