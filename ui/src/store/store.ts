/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {Store, createStore, applyMiddleware, DeepPartial, MiddlewareAPI, Dispatch} from 'redux';
import {composeWithDevTools} from 'redux-devtools-extension';
import createSagaMiddleware from 'redux-saga';
import {connectRouter, routerMiddleware} from 'connected-react-router';
import {IAction, Action, State, Meta, ActionBuilder} from './types';
import rootReducer from './reducers';
import rootSaga from './sagas';
import {History} from "history";
import {initSubscriptionService, middleware as subscribe} from "./subscribe";
import {actions} from "./actions";

interface ActionTreeTree {
    [k: string]: ActionTree;
}

type Builder = ActionBuilder<string, any, any>;

type ActionTree = Builder | ActionTreeTree;

const flatten = (tree: ActionTreeTree):
    {[k: string]: Builder} => {
    const flatten1 = (acts: ActionTreeTree, v1: {[v: string]: Builder}, prefix: string) => {
        const flatten2 = (v2: {[kv: string]: Builder}, k: string) => {
            const a = acts[k];
            if (typeof a === 'function') {
                v2[prefix + k] = a;
            } else {
                flatten1(a as ActionTreeTree, v2, prefix + k + '_');
            }
            return v2;
        };
        return Object.keys(acts).reduce(flatten2, v1);
    };
    return flatten1(tree, {}, '');
};

const logMiddleware = (api: MiddlewareAPI) => (next: Dispatch<Action>) => (action: Action) => {
    // tslint:disable-next-line no-console
    console.log(`DISPATCH ${action.type}`, action);
    return next(action);
};

export default function configureStore(
    history: History<any>,
    initialState: DeepPartial<State>,
): Store<State> {
    // create the composing function for our middlewares
    const composeEnhancers = composeWithDevTools({
        actionCreators: flatten(actions),
    });
    // create the redux-saga middleware
    const sagaMiddleware = createSagaMiddleware();

    // We'll create our store with the combined reducers/sagas, and the initial Redux state that
    // we'll be passing from our entry point.
    const store = createStore(
        connectRouter(history)(rootReducer),
        initialState,
        composeEnhancers(
            applyMiddleware(
            routerMiddleware(history),
            sagaMiddleware,
            subscribe({}),
            logMiddleware)),
    );

    // Don't forget to run the root saga, and return the store object.
    sagaMiddleware.run(rootSaga);
    return initSubscriptionService(store);
}
