/*
 * Copyright (c) 2018 Bob Kerns.
 */

/**
 * Define our actions.
 */
import {ActionType, createStandardAction} from 'typesafe-actions';
import {
    INode, ILink,
    ActionBuilder,
    InitResponse, Meta, NodeState, KeyedPayload,
    ClickPayload, Action, ConnectLinkRequest, ActionKeys, Clickables, Modifier, IAction,
} from './types';
import {LinkState} from "../tags/Link";
import {createSelector} from "reselect";
import {Dispatch, bindActionCreators, MiddlewareAPI, AnyAction, DeepPartial} from "redux";
import {Map} from "immutable";
import {string} from "prop-types";
import {Omit} from "utility-types";

/**
 * Create an action. react-redux omits payload & meta from the action types when not used,
 * which causes problems working with a range of actions, and violates the core idea of a
 * standard action format. It's fine for them to be optional, but they need to be part of
 * the type or it screws up working with the union.
 *
 * Usage pattern:
 *   action(_constant type string_)<_payload type_,_optional meta type>>()
 *
 * This two-step process allows type inferencing to pick up the type.
 * @param type
 */
function action<T extends string>(type: T) {
    const step1 = <P, M extends Meta = Meta>() =>
        createStandardAction(type)<P>() as any as ActionBuilder<T, P, M>;
    return <P, M extends Meta = Meta>() => {
        const creator = step1<P, M>();
        const errorCreator = (error: Error, meta?: Meta) => ({type, error, meta});
        (creator as any).tag = type;
        (creator as any).error = errorCreator;
        return creator;
    };
}

/**
 * Our access to the various action creators.
 */
export const actions = {
    graph: {
        addNodes: action('graph/addNodes')<INode[]>(),
        addLinks: action('graph/addLinks')<ILink[]>(),
        setStartNode: action('graph/setStartNode')<string>(),
        expand: action('graph/expand')<InitResponse>(),

        // Lifecycle
        init: action('graph/init')<InitResponse>(),

    },
    ui: {
        setTitle: action('ui/seetTitle')<string>(),
        setLoading: action('ui/setLoading')<boolean>(),
        clearError: action('ui/clearError')<undefined>(),
        setError: action('ui/setError')<string|Error>(),

        // Lifecycle
        init: action('ui/init')<undefined>(),
        connectLink: action("graph/connectLink")<ConnectLinkRequest>(),

        // Actions for storing specific component state.
        // If the keys are all unique, we could stuff these all into on big Map, but that would be more confusing,
        // and likely less performant, than necssary.
        setNodeState: action('ui/setNodeState')<KeyedPayload<Partial<NodeState>>>(),
        setLinkState: action('ui/setLinkState')<KeyedPayload<Partial<LinkState>>>(),
    },
    user: {
        click: action('user/clickLink')<ClickPayload>(),
    },
    // Actions to be invoked
    cmd: {
        expand: action('cmd/expand')<ClickPayload>(),
        alert: action('cmd/alert')<ClickPayload>(),
    },
};

export function bindActions(dispatch: Dispatch) {
    return createSelector(
        [
            () => action,
            () => dispatch,
        ],
        (a, d) => bindActionCreators(a, d),
    );
}

export type UserActionKeys = ActionKeys<ActionType<typeof actions.user>>;
export type CmdActionKeys = ActionKeys<ActionType<typeof actions.cmd>>;
export type UserAction = IAction<UserActionKeys, ClickPayload, any>;
export type CmdAction = IAction<CmdActionKeys, ClickPayload, any>;
export type CmdActionBuilder = ActionBuilder<CmdActionKeys, ClickPayload, any>;

type CommandMap3 = {
    [m in Modifier | 'default']:
    ActionBuilder<CmdActionKeys, ClickPayload, any> | undefined
};

type CommandMap2 = {
    [i in Clickables | 'default']: CommandMap3;
};

export type CommandMap = {
    [k in UserActionKeys | 'default']: CommandMap2;
};

export const defaultCommandMap: DeepPartial<CommandMap> = {
    [actions.user.click.tag]: {
        default: {
            default: actions.cmd.expand,
        },
    },
};

export function isUserAction(act: AnyAction): act is UserAction {
     return (/^user\//.test(act.type)) && act.payload && act.payload.clicked;
}

export function mapUserAction(act: UserAction, cmdMap: DeepPartial<CommandMap> = defaultCommandMap): CmdAction {
    const evt: ClickPayload = act.payload;
    const clicked = evt.clicked;
    const modifier = evt.modifier;
    // Get rid of the DeepPartial
    const map2 = (cmdMap[act.type] || cmdMap.default) as unknown as CommandMap2;
    if (map2) {
        const map3: CommandMap3 = (map2[evt.clicked] || map2.default);
        if (map3) {
            const builder: CmdActionBuilder = (map3[evt.modifier] || map3.default);
            return builder(act.payload, {cmdSrc: act.type, ...act.meta});
        }
    }
    return null;
}

export const cmdMapMiddleware = (cmdMap: CommandMap) =>
    (api: MiddlewareAPI) => (next: Dispatch) =>
        (act: AnyAction) => {
            if (isUserAction(act)) {
                const cmd = mapUserAction(act, cmdMap);
                if (cmd) {
                    return next(cmd);
                }
            }
            return next(act);
        };
