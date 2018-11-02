/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {actions} from '../store/actions';
import {Action, ActionKeys, Clickables, ClickPayload, IAction} from "../store/types";

const modifiers = [
    '', 'sh', 'c', 'c-sh', 'm', 'm-sh', 'c-m', 'c-m-sh',
];

type Click = IAction<ActionKeys, ClickPayload>;
type Modifier<K = typeof modifiers> =  K extends Array<infer U> ? U : never;

type Cmd = (action: Click) => Action;


type CmdTable = {
    [K in Clickables | 'default']: (Cmd | {[L in Modifier | 'default']: Cmd | {[k: string] : Cmd} });
};

const default_cmds: Partial<CmdTable> = {
    [Clickables.link]: action => actions.cmd.alert(action.payload),
};
