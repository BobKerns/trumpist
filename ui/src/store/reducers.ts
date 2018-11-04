/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {ActionKeys, ErrorPayload, IAction, KeyedPayload, MapValue, NodeState, PayloadFor} from './types';
import {combineReducers, Reducer} from 'redux';
import {Map} from 'immutable';
import {INode, ILink, State, Action} from "./types";
import {ActionType, StateType} from "typesafe-actions";
import {actions} from './actions';
import {DeepReadonly} from "utility-types";
import {LinkState} from "../tags/Link";

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
            return action.payload.reduce((s: S, v: V) => s.set(v.id, v), state) as typeof state;
        case graph.init.tag:
            return state.merge(action.payload.nodes);
        default:
            return state || Map();
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
            return state || Map();
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
function keyedSetter<A extends string, K extends string, D extends any, T extends Map<K, D>>(actType: A, dflt: T) {
    return (state: T, action: Action): T => {
        switch (action.type) {
            case actType:
                const keyed = action as IAction<K, KeyedPayload<K, D>>;
                if (!keyed.payload || !keyed.payload.key) {
                    return state || dflt;
                }
                return state.set(keyed.payload.key, keyed.payload.data);
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
            return state || 0;
    }
}

/**
 * Compose simple reducers working on the same data.
 * @param reducers
 */
function compose<S, A extends Action>(...reducers: Array<Reducer<S, A>>): Reducer<S, A> {
    return (s: any, a: A) => reducers.reduce((ns, f) => f(ns, a), s);
}

/**
 * Handle setting/clearing recorded errors.
 * @param state
 * @param action
 */
function doError(state: ErrorPayload | null, action: Action) {
    switch (action.type) {
        case ui.setError.tag:
            let msg = action.payload.message;
            // Safety; we want the error msg even if we got it the wrong way.
            if ((msg as any) instanceof Error) {
                msg = (msg as any).messsage;
            }
            return {
                message: msg,
                stack: action.payload.stack,
            };
        case ui.clearError.tag:
            return null;
        default:
            return state || null;
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
            return state || "(Unknown)";
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
            return state || null;
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
        connection: setter(graph.setConnection.tag, null),
    }),
    ui: combineReducers({
        title: compose(doTitle, setter(ui.setTitle.tag, '[Unknown]')),
        loading: doLoading,
        error: doError,
        nodeStates: keyedSetter(ui.setNodeState.tag, Map<string, NodeState>()),
        linkStates: keyedSetter(ui.setLinkState.tag, Map<string, LinkState>()),
    }),
});

export default doState;
