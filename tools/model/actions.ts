/*
 * Copyright (c) 2018 Bob Kerns.
 */


import {makeModelState, ModelState} from "./model-state";
import {Map, List, Record, RecordOf} from "immutable";

interface ActionTypeProps {
    readonly name: string;
}
const defaultActionType = {name: ""};

export const makeActionType = Record(defaultActionType);
export type ActionType = RecordOf<ActionTypeProps>;

export interface ApplicationStateProps {
    readonly model: ModelState;
    readonly comms: Map<string, any>;
    readonly actionsTypes: List<ActionType>;
}

const defaultApplicationState = {
    model: makeModelState(),
    comms: Map(),
    actionTypes: List(),
};

export const makeApplicationState = Record(defaultApplicationState);

