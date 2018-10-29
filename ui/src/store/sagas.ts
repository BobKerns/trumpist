/*
 * Copyright (c) 2018 Bob Kerns.
 */


import {take, call, all} from 'redux-saga/effects';
import actions, {INIT_GRAPH} from './actions';

function* fetchInitial(): IterableIterator<any> {
    yield take(INIT_GRAPH);
}

export default function* rootSaga(): IterableIterator<any> {
    yield all([fetchInitial()]);
}
