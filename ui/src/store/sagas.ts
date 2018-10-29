/*
 * Copyright (c) 2018 Bob Kerns.
 */


import {take, call, all, put} from 'redux-saga/effects';
import actions from './actions';
const {ui, graph} = actions;

async function fetchResource<T extends any>(url: string): Promise<T> {
    const req = await fetch(url);
    return req.json();
}

function* fetchInitial(): IterableIterator<any> {
    yield take(graph.init.type);
    const json = yield call(fetchResource, 'http://localhost:3001/api/v1/start');
    yield put(graph.setStartNode(json));
}

export default function* rootSaga(): IterableIterator<any> {
    yield all([fetchInitial()]);
}
