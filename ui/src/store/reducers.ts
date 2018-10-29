/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {ActionKeys, IAction, PayloadFor} from './types';
import {combineReducers} from 'redux';
import {Map} from 'immutable';
import {INode, ILink, State} from "./types";
import {ActionType, StateType} from "typesafe-actions";
import actions, {ADD_LINKS, ADD_NODES, SET_START, SET_TITLE, CLEAR_ERROR, SET_LOADING} from './actions';
import {DeepReadonly} from "utility-types";

export type Action = ActionType<typeof actions>;

function doGraphNodes(state: Map<string, INode> = Map<string, INode>(), action: Action) {
    switch (action.type) {
        case ADD_NODES:
            return action.payload.reduce((s, v) => s.set(v.id, v), state);
        default:
            return state;
    }
}

function doGraphLinks(state: Map<string, ILink> = Map<string, ILink>(), action: Action) {
    switch (action.type) {
        case ADD_LINKS:
            const bar = action;
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
        case SET_LOADING:
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
        case CLEAR_ERROR:
            return null;
        default:
            return action.error || state;
    }
}

export const doState = combineReducers<State, Action>({
    graph: combineReducers({
        nodes: doGraphNodes,
        links: doGraphLinks,
        startNode: setter(SET_START, "foo"),
    }),
    ui: combineReducers({
        title: setter(SET_TITLE, "Unknown"),
        loading: doLoading,
        error: doError,
    }),
});

export default doState;
