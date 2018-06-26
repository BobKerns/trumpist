/*
 * Copyright (c) 2018 Bob Kerns.
 */


import {ModelState} from "./model-state";
import {typeFactory} from "../util/type-factory";

export interface ActionType {
    readonly name: string;
}

export const ActionType = typeFactory<ActionType>('ActionType');

export interface ApplicationState {
    readonly model: ModelState;
    readonly comms: {};
    readonly actionsTypes: {};
}

export const ApplicationState = typeFactory<ApplicationState>('ApplicationState');
