/*
 * Copyright (c) 2018 Bob Kerns.
 */


import {DIRECTION, KIND, MEANING, RELATION, THICKNESS, UUID} from "../brain/src/defs";

export type DateTime = number;

export interface ILinkResult {
    id: UUID;
    from_id: UUID;
    to_id: UUID;
    props: {
        Name: string;
        Label: string;
        link_label: string;
        hierarchy: boolean;
        dir_one_way: boolean;
        dir_shown: boolean;
        dir_specified: boolean;
        dir_reversed: boolean;
        creationTime: DateTime;
        modifiedTime: DateTime;
        brain_Meaning: MEANING;
        brain_Relation: RELATION;
        brain_Direction: DIRECTION;
        brain_Thickness: THICKNESS;
        brain_BrainId: UUID;
        brain_Kind: KIND;
        brain_TypeId?: UUID;
    };
}

export interface INodeResult {
    id: UUID;
    props: {
        name: string;
        label: string;
        creationTime: DateTime;
        modifiedTime: DateTime;
        brain_BrainId: UUID;
        brain_Kind: KIND;
        brain_TypeId?: UUID;
    };
}
