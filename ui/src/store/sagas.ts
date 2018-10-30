/*
 * Copyright (c) 2018 Bob Kerns.
 */


import {take, call, all, put} from 'redux-saga/effects';
import actions from './actions';
import {ActionBuilder, InitResponse, isJSONError, JSONFailure, JSONResponse, ServerErrorMeta} from "./types";
const {ui, graph} = actions;

class ServerError extends Error {
    public readonly op: string;
    public readonly serverStack?: string;
    constructor(message: string, op: string, stack?: string) {
        super(message);
        this.op = op;
        if (stack) {
            this.serverStack = stack;
        }
    }

    public getMessage() {
        return `[${this.op}] ${super.message}`;
    }
}

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
        throw new ServerError(json.error, json.op, json.stack);
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
        const json: JSONResponse = yield call(fetchJSONAsync, url);
        yield put(resp(json));
    } catch (e) {
        if (e instanceof ServerError) {
            const meta: ServerErrorMeta = {
                source: url,
                serverStack: e.stack,
                op: e.op,
            };
            yield put(resp.error(e, meta));
        }
    }
}

/**
 * Saga to obtain our initial startup info from the server.
 */
function* fetchInit(): IterableIterator<any>  {
    const url = 'http://localhost:3001/api/v1/start';
    const req = ui.init;
    yield take(req.tag);
    return yield fetchJSON(graph.init, url);
}

/**
 * Our top Saga that runs them all.
 */
export default function* rootSaga(): IterableIterator<any> {
    yield all([
        fetchInit(),
    ]);
}
