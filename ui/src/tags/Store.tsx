/*
 * Copyright (c) 2018 Bob Kerns.
 */

/**
 * Make the actual store available, not just the dispatch() function.
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {Action, State} from "../store";
import {AnyAction, Reducer, Store, Unsubscribe} from "redux";

export const StoreContext = React.createContext<Store<any, AnyAction>>({
    dispatch(action: AnyAction): any { throw new Error("Attempt to dispatch to a disconnected store."); },
    subscribe(listener: () => any): Unsubscribe { throw new Error("Attempt to subscribe to a disconnected store."); },
    getState(): State { throw new Error("Attempt to examine a disconnected store."); },
    replaceReducer(nextReducer: Reducer<Store<any, AnyAction>>): number {
        throw new Error("Attempt to replace the reducer on a disconnected store.");
    },
});

export const StoreProvider = StoreContext.Provider;
export const StoreConsumer = StoreContext.Consumer;

export default StoreContext;
