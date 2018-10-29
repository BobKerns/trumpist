/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {Store, createStore, applyMiddleware, DeepPartial, MiddlewareAPI, Dispatch} from 'redux';
import {composeWithDevTools} from 'redux-devtools-extension';
import createSagaMiddleware from 'redux-saga';
import {connectRouter, routerMiddleware} from 'connected-react-router';
import {IAction, Action, State} from './types';
import rootReducer from './reducers';
import rootSaga from './sagas';
import {History} from "history";

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
    const composeEnhancers = composeWithDevTools({});
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
            logMiddleware)),
    );

    // Don't forget to run the root saga, and return the store object.
    sagaMiddleware.run(rootSaga);
    return store;
}
