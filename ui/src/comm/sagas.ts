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
import {
    actions,
    Action,
    ActionBuilder,
    ErrorPayload, GraphQuery, IAction, ILink, INode,
    isJSONError,
    JSONFailure,
    JSONResponse, JSONSuccess, ROOT_VIEW,
    ServerErrorMeta,
    makeView, ViewOptions,
} from "../store";

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
        console.error(this.message, stack);
    }
}



/**
 * Our top Saga that runs them all.
 */

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

function maybeStringify(obj: any) {
    if (typeof obj === "number") {
        return String(obj);
    } else if (typeof obj === "string") {
        if (/^\[|^{|^\d+$/.test(obj)) {
            return JSON.stringify(obj);
        } else {
            return obj;
        }
    } else {
        return JSON.stringify(obj);
    }
}

export function encodeParams(obj: {[key: string]: any}): string {
    return Object.keys(obj)
        .map((k) => `${maybeStringify(k)}=${maybeStringify(obj[k])}`)
        .join('&');
}

/**
 * Fetch a JSON resource
 * @param url
 */
export async function fetchJSONAsync<T extends object>(url: string, params?: {[k: string]: any}): Promise<T> {
    const fullURL = new URL(url, "http://localhost:3000/");
    const paramArray = Object.keys(params || {})
        .map((k): [string, string] => [k, maybeStringify(params[k])]);
    fullURL.search = encodeParams(params || {});
    const req = await fetch(String(fullURL));
    const json: JSONResponse = await req.json();
    if (isJSONError(json)) {
        throw new ServerError(`${json.error} [${json.op} ${url}]`, json.op, json.stack);
    }
    return fixJSON(json.payload) as T;
}

interface StartPayload {
    title: string;
    view: {
        nodes: INode[];
        links: ILink[];
        options: ViewOptions;
    };
}

/**
 * Saga to fetch JSON at some URL
 * @param resp
 * @param url
 */
function* fetchJSON(resp: ActionBuilder<string, any>, url: string): IterableIterator<any>  {
    try {
        yield put(actions.ui.setLoading(true));
        const json: StartPayload = yield call(fetchJSONAsync, url);
        const title: string = json.title;
        if (title) {
            yield put (ui.setTitle(title));
        }
        yield put(resp({
            id: ROOT_VIEW,
            view: makeView(json.view.nodes, json.view.links, json.view.options),
        }));
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
export function* fetchInit(): IterableIterator<any>  {
    function* expandOne(action: Action): IterableIterator<any> {
        const url = '/api/v1/start';
        return yield fetchJSON(graph.set, url);
    }
    yield takeEvery(ui.init.tag, expandOne);
}

export function* fetchQuery(): IterableIterator<any> {
    function* expandOne(action: ReturnType<typeof graph.query>): IterableIterator<any> {
        const payload = action.payload;
        if (payload) {
            const url = `/api/v1/node/${action.payload.queryParams.id}/${action.payload.queryId}`;
            return yield fetchJSON(graph.query, url);
        }
    }
    yield takeEvery(graph.query.tag, expandOne);
}

    // Run the Sagas.
export default function* rootSaga(): IterableIterator<any> {
    yield all([
        fetchInit(),
        fetchQuery(),
    ]);
}
