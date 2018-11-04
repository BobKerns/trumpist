/*
 * Copyright (c) 2018 Bob Kerns.
 */

/**
 * Moudule to enable subscription and injection of middleware through the Redux dispatch mechanism.
 */

import {actions} from "./actions";
import {Action, AnyAction, applyMiddleware, Dispatch, Middleware, MiddlewareAPI, Store} from "redux";
import {IAction} from "./types";
import {inspect} from "util";

export interface SubscribeMiddlewareOpts {
}

export const defaultOpts: SubscribeMiddlewareOpts = Object.freeze({
});

const SUBSCRIBE_TYPE = "$$Subscribe$$";
const MIDDLEWARE_TYPE = "$$Middleware$$";
const SET_STORE_TYPE = "$$SetStore$$";

export type UnsubCallback = (unsub: () => void) => any;
export type ChangeListener = (newVal: any, oldVal: any) => any;
export type Selector = (val: any) => any;

/**
 * Payload for a subscribe request
 */
export interface SubscribeReq {
    selector?: Selector;
    listener: ChangeListener;
    unsubCallback: UnsubCallback;
}

export interface MiddlewareReq {
    middleware: Middleware;
    unsubCallback: UnsubCallback;
}

function subscribe(store: Store, request: SubscribeReq, subscription: object, id: number) {
    let oldState: any;
    let oldSub: any;
    const selector = request.selector || ((state: any) => state);
    const listener = () => {
        const state = store.getState();
        if (state !== oldState) {
            oldState = state;
            const sub = selector(state);
            if (sub !== oldSub) {
                oldSub = sub;
            }
        }
    };
    const unsubscribe = store && store.subscribe(listener);
    if (unsubscribe) {
        request.unsubCallback(unsubscribe);
    }
}

interface MiddlewareRegistry {
    [k: number]: (next: Dispatch<AnyAction>) => Dispatch<AnyAction>;
}

function addMiddleware(store: Store, request: MiddlewareReq, middlewares: MiddlewareRegistry, id: number,
                       api: MiddlewareAPI, update: () => void) {
    middlewares[id] = request.middleware(api);
    update();
    request.unsubCallback(() => {
        delete middlewares[id];
        update();
    });
}

export function middleware<
    DispatchExt = {},
    S = any,
    D extends Dispatch = Dispatch
    >(options?: SubscribeMiddlewareOpts): Middleware<DispatchExt, S, D> {
    let store: Store = null;
    // const opts = { ...defaultOpts, ...options};
    let id: number = 0;
    const nextId = () => id++;
    const subscriptions: {[id: number]: ChangeListener} = {};
    return (api: MiddlewareAPI<D, S>) =>
        (next: Dispatch<AnyAction>) => {
            const dispatchers: MiddlewareRegistry = {};
            let dispatch = next;
            const update = () => {
                let d = next;
                for (const m of Object.values(dispatchers)) {
                    d = m(d);
                }
                dispatch = d;
            };
            return (act: AnyAction): any => {
                switch (act.type) {
                    case SUBSCRIBE_TYPE: {
                        const a = act as IAction<string, SubscribeReq>;
                        return subscribe(store, a.payload, subscriptions, nextId());
                    }
                    case MIDDLEWARE_TYPE: {
                        const a = act as IAction<string, MiddlewareReq>;
                        return addMiddleware(store, a.payload, dispatchers, nextId(), api, update);
                    }
                    case SET_STORE_TYPE: {
                        const a = act as IAction<string, Store>;
                        if (store && (store !== a.payload)) {
                            throw new Error("Changing stores is not allowed.");
                        }
                        if (api.getState() !== a.payload.getState()) {
                            throw new Error("Attempt to set incorrect store.");
                        }
                        store = a.payload;
                        break;
                    }
                    default:
                        // Pass it along
                        return dispatch(act);
                }
            };
        };
}

export function initSubscriptionService(store: Store): Store {
    store.dispatch({type: SET_STORE_TYPE, payload: store});
    return store;
}
