/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {ActionKeys, IAction, PayloadFor} from './types';
import {combineReducers, Reducer} from 'redux';
import {Map} from 'immutable';
import {INode, ILink, State, Action} from "./types";
import {ActionType, StateType} from "typesafe-actions";
import actions from './actions';
import {DeepReadonly} from "utility-types";

const {ui, graph} = actions;

function doGraphNodes(state: Map<string, INode> = Map<string, INode>(), action: Action) {
    switch (action.type) {
        case graph.addNodes.tag:
            return action.payload.reduce((s, v) => s.set(v.id, v), state);
        case graph.init.tag:
            return state.merge(action.payload.nodes);
        default:
            return state;
    }
}

function doGraphLinks(state: Map<string, ILink> = Map<string, ILink>(), action: Action) {
    switch (action.type) {
        case graph.addLinks.tag:
            return action.payload.reduce((s, v) => s.set(v.id, v), state);
        case graph.init.tag:
            return state.merge(action.payload.links);
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
        case ui.setLoading.tag:
            if (action.payload) {
                return state + 1;
            } else {
                return state - 1;
            }
        default:
            return state;
    }
}

function compose(...reducers: Reducer[]): Reducer {
    return (s: any, a: Action) => reducers.reduce((ns, f) => f(ns, a), s);
}

function doError(state: Error|null = null, action: Action) {
    switch (action.type) {
        case ui.clearError.tag:
            return null;
        default:
            return action.error || state;
    }
}

function doTitle(state: string, action: Action) {
    switch (action.type) {
        case graph.init.tag:
            return (action.payload && action.payload.title) || "(Empty)";
        default:
            return state;
    }
}

function doStartNode(state: string, action: Action) {
    switch (action.type) {
        case graph.init.tag:
            return (action.payload && action.payload.start);
        default:
            return state;
    }
}

export const doState = combineReducers<State, Action>({
    graph: combineReducers({
        nodes: doGraphNodes,
        links: doGraphLinks,
        startNode: compose(doStartNode, setter(graph.setStartNode.tag, null)),
    }),
    ui: combineReducers({
        title: compose(doTitle, setter(ui.setTitle.tag, '[Unknown]')),
        loading: doLoading,
        error: doError,
    }),
});

export default doState;
