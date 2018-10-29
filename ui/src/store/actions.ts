/*
 * Copyright (c) 2018 Bob Kerns.
 */

/**
 * Define our actions.
 */
import {createStandardAction} from 'typesafe-actions';
import {INode, ILink, ActionBuilder, InitResponse, Meta} from './types';

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
    const step1 = <P, M = any>() =>
        createStandardAction(type)<P>() as unknown as ActionBuilder<T, P, M>;
    return <P, M = any>() => {
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
export default {
    graph: {
        addNodes: action('graph/addNodes')<INode[]>(),
        addLinks: action('graph/addLinks')<ILink[]>(),
        setStartNode: action('graph/setStartNode')<string>(),
        init: action('graph/init')<InitResponse>(),
    },
    ui: {
        setTitle: action('ui/seetTitle')<string>(),
        setLoading: action('ui/stLoading')<boolean>(),
        clearError: action('ui/clearError')<undefined>(),
        init: action('ui/init')<undefined>(),
    },
};
