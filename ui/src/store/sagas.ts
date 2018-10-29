/*
 * Copyright (c) 2018 Bob Kerns.
 */


import {take, call, all, put} from 'redux-saga/effects';
import actions from './actions';
import {ActionBuilder, InitResponse} from "./types";
const {ui, graph} = actions;

/**
 * Fetch a JSON resource
 * @param url
 */
async function fetchJSONAsync<T extends object>(url: string): Promise<T> {
    const req = await fetch(url);
    return req.json();
}

/**
 * Saga to obtain our initial startup info from the server.
 */
function* fetchInit(): IterableIterator<any>  {
    const url = 'http://localhost:3001/api/v1/start?foo';
    const req = ui.init;
    yield take(req.tag);
    return yield fetchJSON(graph.init, url);
}

function* fetchJSON(resp: ActionBuilder<string, any>, url: string): IterableIterator<any>  {
    try {
        const json: InitResponse = yield call(fetchJSONAsync, url);
        yield put(resp(json));
    } catch (e) {
        yield put(resp.error(e, {source: url}));
    }
}

export default function* rootSaga(): IterableIterator<any> {
    yield all([fetchInit()]);
}
