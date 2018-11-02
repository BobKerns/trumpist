/*
 * Copyright (c) 2018 Bob Kerns.
 */

/**
 * Define our actions.
 */
import {createStandardAction} from 'typesafe-actions';
import {
    INode, ILink,
    ActionBuilder,
    InitResponse, Meta, NodeState, KeyedPayload,
    ClickPayload, Action, ConnectLinkRequest,
} from './types';
import {LinkState} from "../tags/Link";
import {createSelector} from "reselect";
import {Dispatch, bindActionCreators} from "redux";

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
        createStandardAction(type)<P>() as unknown as ActionBuilder<T, P, M>;
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
