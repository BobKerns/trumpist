/*
 * Copyright (c) 2018 Bob Kerns.
 */

/**
 * Timestamps in ISO format, in UTC, e.g. 2018-06-02T18:48:39.205738, precise to the microsecond.
 */
export type TIMESTAMP = string;

/**
 * Standard UUID's, used as record IDs
 */
export type UUID = string;

/**
 *  Color, as a signed integer value. (I have not investigated the format—possibly sign-extended RGBA?)
 */
export type COLOR = number;


/** Thickness as a number, appears to be integer multiples of 100. */
export type THICKNESS = number;


export const ID_SETTING_INIT: UUID = "a395b570-4456-519c-b534-af7b81b5aaf1";
export const ID_NULL_NODE: UUID = '00000000-0000-0000-0000-000000000000';

/**
 * Values for the Kind: member in ThBrain's data exports for links.
 *
 * This is used in both links and nodes.
 * @see [[INode]]
 * @see [[ILink]]
 */
export enum KIND {
    /**
     * Normal user nodes
     */
    NODE= 1,
    /**
     * Normal user links
     *
     * Same value as [[KIND.NODE]], but for data loaded from a separate file.
     */
    LINK = 1,
    /**
     * Applies to both node types and link types.
     */
    TYPE = 2,
    /**
     * A tag, or a link from a tag.
     */
    TAG = 4,
    /**
     * Special link for pinned items.
     */
    SPECIAL = 5,
}


/**
 * Type information for Nodes and Links
 */
interface IBrainTyped {
    Kind: KIND;
    TypeId?: UUID;
}

/**
 * Brain Timestamps
 */
interface IBrainTimeStamps {
    /** Date and time the record was created. */
    CreationDateTime: TIMESTAMP;
    /** Time the record was last modified. */
    ModificationDateTime: TIMESTAMP;
}

/**
 * Brain common fields
 */
export interface IBrainCommon extends IBrainTimeStamps {
    /** Unique ID for this record. */
    Id: UUID;
    /** Unique ID for this brain. */
    BrainId: UUID;
}

/** Values for the ACType: flag. */
export enum ACType {
    /**
     * Node is sharable with the public on the web
     */
    PUBLIC = 0,
    /**
     * Node is not shared.
     */
    PRIVATE = 1,
}

/** The fields of an INode, loaded from thoughts.json. */
export interface INode extends IBrainCommon, IBrainTyped {
    /** The user-visible name of this node. */
    Name: string;
    /** The less visible description of this node. May be the empty string. */
    Label: string;
    /** Access control flag, public/private. */
    ACType: ACType;
    /** The foreground color for drawing the node. */
    ForegroundColor: COLOR;
    /** The background color for drawing the node. */
    BackgroundColor: COLOR;
     /** Always [] */
    TagIds: UUID[];
}

/**
 * Values for the Relation: member inTheBrain's data exports for links.
 */
export enum RELATION {
    /**  Only for prototype links (link types). These link to and from the [[ID_NULL_NODE]]. */
    PROTO = 0,
    /** Hierarchical links (vertical) */
    HIERARCHY = 1,
    /** Jump links (i.e. horizontal, non-hierarchical) */
    JUMP = 3,
}

/**
 * A flag word describing which direction the arrow should point.
 * Decoded bitwise, or -1 for unspecified (and inherited or implied).
 */
export enum DIRECTION {
    /** Direction not specified. The actual value will be obtained from the arrow type, or not be relevant. */
    UNSPECIFIED = -1,
    /** The link is asymmetric and should show an arrowhead, */
    DIRECTIONAL = 1,
    /** The link is reversed compared to the prototype/link type. */
    REVERSED = 2,
    /** The link is marked "one way" and should not be followed in the reverse direction. */
    ONE_WAY = 4,
    /** The link has had its direction specified, overriding the default from prototype or general. */
    SPECIFIED = 8,
}

/**
 * Interpretation of the Meaning: attribute in Brain links.
 */
export enum MEANING {
    /**
     * A prototype link (that serves as a link type description).
     * * Kind will be 2, see [[KIND.TYPE]].
     * * Relation will be 0, see [[RELATION.PROTO]]
     */
    PROTO = 0,
    /**
     * A normal link between normal nodes.
     * * Kind will be 1, see [[KIND.LINK]]
     * * Relation will be either 1 or 3,
     *   * see [[RELATION.HIERARCHY]]
     *   * see [[RELATION.JUMP]]
     */
    NORMAL = 1,
    /**
     * A link from a type node to a member of that type. (The opposite direction from a type pointer).
     * * Kind: will be 2, see [[KIND.TYPE]]
     * * Relation: will be 1, [[RELATION.HIERARCHY]]
     */
    MEMBER = 2,
    /**
     * A link from a type to a subtype. (The opposite direction from a supertype pointer).
     * * Kind: will be 1, see [[KIND.LINK]]
     * * Relation: will be 1 see [[RELATION.HIERARCHY]]
     * * Direction: will be -1 (unspecified).
     */
    SUBTYPE = 3,
    /**
     * A link fom tags to the items tagged. (The opposite direction from our model).
     * * Kind: will be 1, see [[KIND.LINK]]
     * * Relation: will be 1, see [[RELATION.HIERARCHY]]
     * * Direction: will be -1
     */
    TAG = 5,
    /**
     * A link to pinned posts, from the node named "Pinned".
     * * Kind: will be 1, see [[KIND.LINK]]
     * * Relation: will be 1, see [[RELATION.HIERARCHY]]
     * * Direction; will be -1
     */
    PIN = 6,
}

/**
 * A descriptor for a [[MEANING]]
 */
export interface MeaningDescriptor {
    /** The expected Kind: [[KIND]] field */
    Kind: KIND;
    /** The label we assign to arrows wih this meaning (if not a user-defined arrow type) */
    label?: string;
    /** If true, the Brain model uses the arrow in the opposite direction from our usage, so reverse on input. */
    reverse?: boolean;
    /** One or more expected values for the Relation: [[RELATION]] field. */
    Relation: RELATION[];
    /** Expected value for the Direction: [[Direction]] field. */
    Direction?: DIRECTION;
}

/**
 * Descriptors for the various [[MEANING]], describing now they related to the other properties.
 */
export const MEANING_DESCRIPTORS: MeaningDescriptor[] = new Array(6);
MEANING_DESCRIPTORS[MEANING.PROTO] = {
    label: '_PROTO',
    reverse: false,
    Kind: KIND.TYPE,
    Relation: [RELATION.PROTO],
};
MEANING_DESCRIPTORS[MEANING.NORMAL] = {
    Kind: KIND.LINK,
    reverse: false,
    Relation: [RELATION.HIERARCHY, RELATION.JUMP],
};
MEANING_DESCRIPTORS[MEANING.MEMBER] = {
    label: '_TYPE',
    reverse: true,
    Kind: KIND.TYPE,
    Relation: [RELATION.HIERARCHY],
    Direction: DIRECTION.UNSPECIFIED,
};
MEANING_DESCRIPTORS[MEANING.SUBTYPE] = {
    label: '_SUPER',
    reverse: true,
    Kind: KIND.LINK,
    Relation: [RELATION.HIERARCHY],
    Direction: DIRECTION.UNSPECIFIED,
};
MEANING_DESCRIPTORS[MEANING.TAG] = {
    label: '_TAG',
    reverse: true,
    Kind: KIND.LINK,
    Relation: [RELATION.HIERARCHY],
    Direction: DIRECTION.UNSPECIFIED,
};
MEANING_DESCRIPTORS[MEANING.PIN] = {
    label: '_PIN',
    Kind: KIND.LINK,
    reverse: false,
    Relation: [RELATION.HIERARCHY],
    Direction: DIRECTION.UNSPECIFIED,
};

/**
 * The field of an ILink loaded from links.json.
 */
export interface ILink extends IBrainCommon, IBrainTyped {
    /** h name of the link, if any */
    Name: string;
     /** The Id of the "from" node. */
    ThoughtIdA: UUID;
    /** The ID of the "to" node. */
    ThoughtIdB: UUID;
    /** The high level meaning of this arrow. */
    Meaning: MEANING;
    /** How the arrow connects the nodes. */
    Relation: RELATION;
    /** How to display directionality. */
    Direction: DIRECTION;
    /** Thickness of the drawn lines. */
    Thickness: THICKNESS;
}
