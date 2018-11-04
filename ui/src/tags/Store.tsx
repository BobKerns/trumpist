/*
 * Copyright (c) 2018 Bob Kerns.
 */

/**
 * Make the actual store available, not just the dispatch() function.
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {Action, State} from "../store";
import {Unsubscribe} from "redux";

export const StoreContext = React.createContext({
    dispatch(action: Action): any { throw new Error("Attempt to dispatch to a disconnected store."); },
    subscribe(listener: () => any): Unsubscribe { throw new Error("Attempt to subscribe to a disconnected store."); },
    getState(): State { throw new Error("Attempt to examine a disconnected store."); },
});

export const StoreProvider = StoreContext.Provider;
export const StoreConsumer = StoreContext.Consumer;

export default StoreContext;
