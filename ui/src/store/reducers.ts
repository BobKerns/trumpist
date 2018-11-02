/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {ActionKeys, IAction, KeyedPayload, MapValue, PayloadFor} from './types';
import {combineReducers, Reducer} from 'redux';
import {Map} from 'immutable';
import {INode, ILink, State, Action} from "./types";
import {ActionType, StateType} from "typesafe-actions";
import {actions} from './actions';
import {DeepReadonly} from "utility-types";

const {ui, graph} = actions;


/**
 * Handle actions that update links in the graph.
 * @param state
 * @param action
 */
function doGraphNodes(state: Map<string, INode> = Map<string, INode>(), action: Action) {
    type S = typeof state;
    type V = MapValue<S>;
    switch (action.type) {
        case graph.addNodes.tag:
            return action.payload.reduce((s: S, v: V) => s.set(v.id, v), state);
        case graph.init.tag:
            return state.merge(action.payload.nodes);
        default:
            return state;
    }
}

/**
 * Handle actions that update links in the graph.
 * @param state
 * @param action
 */
function doGraphLinks(state: Map<string, ILink> = Map<string, ILink>(), action: Action) {
    type S = typeof state;
    type V = MapValue<S>;
    switch (action.type) {
        case graph.addLinks.tag:
            return action.payload.reduce((s: S, v: V) => s.set(v.id, v), state);
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

/**
 * Generalized Map setter
 * @param actType
 * @param dflt Default/initial value
 * @returns {Function}
 */
function keyedSetter<
    T extends PayloadFor<Action, K> & KeyedPayload<T['data']>,
    K extends ActionKeys<Action> & string
    >(actType: K, dflt: T) {
    return (state: T, action: Action): T => {
        switch (action.type) {
            case actType:
                const keyed = action as IAction<K, KeyedPayload<T['data']>>;
                if (!keyed.payload || !keyed.payload.key) {
                    return state || dflt;
                }
                return action.payload as T['data'];
            default:
                return state || dflt;
        }
    };
}

/**
 * Handle [[ui.setLoading]] actions to track our loading state.
 * @param state
 * @param action
 */
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

/**
 * Compose simple reducers working on the same data.
 * @param reducers
 */
function compose(...reducers: Reducer[]): Reducer {
    return (s: any, a: Action) => reducers.reduce((ns, f) => f(ns, a), s);
}

/**
 * Handle setting/clearing recorded errors.
 * @param state
 * @param action
 */
function doError(state: Error|null = null, action: Action) {
    switch (action.type) {
        case ui.clearError.tag:
            return null;
        default:
            return action.error || state;
    }
}

/**
 * Handle setting the browser title.
 * @param state
 * @param action
 */
function doTitle(state: string, action: Action) {
    switch (action.type) {
        case graph.init.tag:
            return (action.payload && action.payload.title) || "(Empty)";
        default:
            return state;
    }
}

/**
 * Handle setting our starting node.
 * @param state
 * @param action
 */
function doStartNode(state: string, action: Action) {
    switch (action.type) {
        case graph.init.tag:
            return (action.payload && action.payload.start);
        default:
            return state;
    }
}

/**
 * Our master handler.
 */
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
        nodeStates: keyedSetter(ui.setNodeState.tag, null),
        linkStates: keyedSetter(ui.setLinkState.tag, null),
    }),
});

export default doState;
