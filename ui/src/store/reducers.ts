/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {
    ActionKeys,
    ErrorPayload,
    IAction,
    KeyedPayload, LayoutMgrState,
    MapValue,
    NodeState,
    PayloadFor,
    ROOT_VIEW,
} from './types';
import {combineReducers, Reducer} from 'redux';
import {Map} from 'immutable';
import {INode, ILink, State, Action, LinkState} from "./types";
import {actions} from './actions';
import {DeepReadonly} from "utility-types";
import {IView, makeView} from "./view";

const {ui, app, graph} = actions;


/**
 * Handle actions that update links in the graph.
 * @param state
 * @param action
 */
function doGraph(state: Map<string, IView> = Map<string, IView>(), action: Action): Map<string, IView> {
    type S = typeof state;
    type V = MapValue<S>;
    switch (action.type) {
        case graph.update.tag:
            const payload = action.payload;
            const u1 = state.get(payload.id);
            const nodes = u1.nodes
                .removeAll(payload.removeNodes)
                .merge(payload.nodes);
            const links = u1.links
                .removeAll(payload.removeLinks)
                .merge(payload.links);
            const options = {...u1.options, ...(payload.options || {})};
            const nval = makeView(nodes, links, options);
            return state.set(payload.id, nval);
        case graph.create.tag:
        case graph.set.tag:
            return state.set(action.payload.id, action.payload.view);
        case graph.remove.tag:
            return state.remove(action.payload.id);
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
        case ui.setTitle.tag:
            return (action.payload && action.payload) || state || "(Empty)";
        default:
            return state || "(Unknown)";
    }
}

/**
 * Our master handler.
 */
export const doState = combineReducers<State, Action>({
    graph: doGraph,
    app: combineReducers({
        connection: (state: string, action: Action) => "foo",
    }),
    ui: combineReducers({
        title: compose(doTitle, setter(ui.setTitle.tag, '[Unknown]')),
        loading: doLoading,
        error: doError,
        layoutStates: keyedSetter(ui.setLayout.tag, Map<string, LayoutMgrState>()),
    }),
});

export default doState;
