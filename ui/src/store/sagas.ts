/*
 * Copyright (c) 2018 Bob Kerns.
 */

/**
 * General workflow actions, especially talking to the back end.
 */

/**
 * Imports
 */
import {take, call, all, put, takeEvery, delay, fork} from 'redux-saga/effects';
import {actions} from './actions';
import {
    Action,
    ActionBuilder,
    ErrorPayload,
    InitResponse,
    isJSONError,
    JSONFailure,
    JSONResponse,
    ServerErrorMeta,
} from "./types";
import It = jest.It;
const {ui, graph, cmd} = actions;

class ServerError extends Error {
    public readonly op: string;
    public readonly serverStack?: string;
    constructor(message: string, op: string, stack?: string) {
        super(`[${op}] ${message}`);
        this.op = op;
        if (stack) {
            this.serverStack = stack;
        }
    }
}


/**
 * Our top Saga that runs them all.
 */
export default function* rootSaga(): IterableIterator<any> {

    function fixJSON(json: any) {
        if (!json || (typeof json !== 'object')) {
            return json;
        }
        switch (json.$type$) {
            case 'NUMBER':
                if (json.high < 0) {
                    return Number.NEGATIVE_INFINITY;
                }
                return Number.POSITIVE_INFINITY;
            case 'DATE':
                const date = new Date(json.unix);
                (date as any).getNanoseconds = () => json.nano;
                return date;
            default:
                if (Array.isArray(json)) {
                    const len = json.length;
                    const nn = new Array(len);
                    let fixed = false;
                    for (let i = 0; i < len; i++) {
                        const nv = json[i];
                        const nnv = fixJSON(nv);
                        if (nnv !== nv) {
                            fixed = true;
                        }
                        nn[i] = nnv;
                    }
                    return fixed ? nn : json;
                } else if (typeof json === 'object') {
                    const nn: { [k: string]: any } = {};
                    let fixed = false;
                    for (const k in json) {
                        if (json.hasOwnProperty(k)) {
                            const nv = json[k];
                            const nnv = fixJSON(nv);
                            if (nv !== nnv) {
                                fixed = true;
                            }
                            nn[k] = nnv;
                        }
                    }
                    return fixed ? nn : json;
                }
                return json;
        }
    }

    /**
     * Fetch a JSON resource
     * @param url
     */
    async function fetchJSONAsync<T extends object>(url: string): Promise<T> {
        const req = await fetch(url);
        const json: JSONResponse = await req.json();
        if (isJSONError(json)) {
            throw new ServerError(`${json.error} [${json.op} ${url}]`, json.op, json.stack);
        }
        return fixJSON(json.payload) as T;
    }

    /**
     * Saga to fetch JSON at some URL
     * @param resp
     * @param url
     */
    function* fetchJSON(resp: ActionBuilder<string, any>, url: string): IterableIterator<any>  {
        try {
            yield put(actions.ui.setLoading(true));
            const json: JSONResponse = yield call(fetchJSONAsync, url);
            yield put(resp(json));
        } catch (e) {
            const meta: ServerErrorMeta = {
                source: url,
                serverStack: e.stackStack,
                op: e.op,
            };
            yield put(resp.error(e, meta));
            yield(delay(3000));
            yield fork(fetchJSON, resp, url);
        } finally {
            yield put(actions.ui.setLoading(false));
        }
    }

    /**
     * Saga to obtain our initial startup info from the server.
     */
    function* fetchInit(): IterableIterator<any>  {
        function* expandOne(action: Action): IterableIterator<any> {
            const url = '/api/v1/start';
            return yield fetchJSON(graph.init, url);
        }
        yield takeEvery(ui.init.tag, expandOne);
    }

    function* fetchExpand(): IterableIterator<any> {
        function* expandOne(action: Action): IterableIterator<any> {
            const url = `/api/v1/${action.payload}/expand`;
            return yield fetchJSON(graph.expand, url);
        }
        yield takeEvery(cmd.expand.tag, expandOne);
    }

    // Run the Sagas.

    yield all([
        fetchInit(),
        fetchExpand(),
    ]);
}
