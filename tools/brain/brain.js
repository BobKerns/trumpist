/*
 * Copyright (c) 2018 Bob Kerns.
 */
/**
 * @module brain
 */

const R = require('ramda');

/**
 * Values for the Kind: member in ThBrain's data exports for links.
 * @typedef {number} module:brain~enum_Kind
 * @see module:brain~KIND
 */

/**
 * Values for the Kind: member in ThBrain's data exports for links.
 * @type {{NODE: module:brain~enum_Kind,
 *         LINK: module:brain~enum_Kind,
 *         TYPE: module:brain~enum_Kind,
 *         TAG: module:brain~enum_Kind,
 *         SPECIAL: module:brain~enum_Kind}}
 * @enum
 * @readonly
 */
const KIND = {
    /**
     * Normal user nodes
     * @type module:brain~enum_Kind
     */
    NODE: 1,
    /**
     * Normal user links
     *
     * Same value as {@link module:brain~KIND|KIND.NODE}, but for data loaded from a separate file.
     * @type module:brain~enum_Kind
     */
    LINK: 1,
    /**
     * Applies to both node types and link types.
     * @type module:brain~enum_Kind
     */
    TYPE: 2,
    /**
     * A tag, or a link from a tag.
     * @type module:brain~enum_Kind
     */
    TAG: 4,
    /**
     * Special link for pinned items.
     * @type module:brain~enum_Kind
     */
    SPECIAL: 5  // e.g Pinned
};

/**
 * Values for the Relation: member in ThBrain's data exports for links.
 * @typedef {number} module:brain~enum_Relation
 * @see module:brain~RELATION for the specific values
 */

/**
 * Values for the Relation: member inTheBrain's data exports for links.
 * @type {{PROTO: module:brain~enum_Relation, HIERARCHY: module:brain~enum_Relation, JUMP: module:brain~enum_Relation}}
 * @enum
 * @readonly
 */
const RELATION = {
    /**  Only for prototype links (link types). These link to and from the {@link ID_NULL_NODE|null object}. */
    PROTO: 0,
    /** Hierarchical links (vertical) */
    HIERARCHY: 1,
    /** Jump links (i.e. horizontal, non-hierarchical) */
    JUMP: 3
};

/**
 * The ID of the null node in Brain, used as endpoints of prototypical arrows for link types.
 * @type {string}
 */
const ID_NULL_NODE = '00000000-0000-0000-0000-000000000000';

/**
 * A flag word describing which direction the arrow should point.
 * @typedef {number} module:brain~flag_Direction
 * @see module:brain~FLAG_SPECIFIED
 * @see module:brain~FLAG_ONE_WAY
 * @see module:brain~FLAG_DIRECTIONAL
 * @see module:brain~FLAG_REVERSED
 */

/**
 * @summary The link is asymmetric and should show an arrowhead
 * @type {module:brain~flag_Direction}
 */
const FLAG_DIRECTIONAL = 1;
/**
 * @summary The link is reversed compared to the prototype/link type
 * @type {module:brain~flag_Direction}
 */
const FLAG_REVERSED = 2;
/**
 * @summary The link is marked "one way" and should not be followed in the reverse direction
 * @type {module:brain~flag_Direction}
 */
const FLAG_ONE_WAY = 4;
/**
 * The link has had its direction specified, overriding the default from prototype or general.
 * @type {module:brain~flag_Direction}
 */
const FLAG_SPECIFIED = 8;

/**
 * Value used to indicate no value has been supplied
 * @type {module:brain~flag_Direction}
 */
const FLAG_VAL_UNSPECIFIED = -1;

/**
 * Enumeration of the Meaning: attribute in Brain links
 * @typedef {number} module:brain~enum_Meaning
 * @see module:brain~MEANING for details including numeric values
 */

/**
 * Entries in the {@link module:brain~MEANING|MEANING} table.
 * @property {enum_Meaning}   code            - The numeric value of the Meaning: enumeration.
 *                                              See {@link module:brain~enum_Meaning|enum_Meaning}.
 * @property {string}         [label]         - The hardwired string label to use on these arrows.
 *                                              Omitted for user-defined (@link module:brain~MEANING|MEANING.NORMAL},
 *                                              as that will be the user-defined type.
 * @property {enum_Kind}      Kind            - The numeric value of the Kind: attribute used with this Meaning: See {@link module:brain~enum_Kind|enum_Kind}.
 * @property {enum_Relation}  Relation        - An array of the allowed values for the Relation: attribute. See {@link module:brain~enum_Relation|enum_Relation}
 * @property {flag_Direction} Direction       - A {@link module:brain~flag_Direction|number decoded bitwise} indicating which direction, if any, the arrows should point.
 * @property {boolean}        [reverse=false] - True if our representation is reversed in direction from TheBrain's
 */

class MeaningDescriptor {
    constructor(options) {
        Object.assign(this, options);
    }
}

/**
 * Interpretation of the Meaning: attribute in Brain links.
 *
 * Valid combinations:
 *
 * |[Meaning:]{@link module:bain~MEANING}|label     |[Kind]{@link module:brain~KIND}|[Relation]{@link module:brain~Relation}|Direction|reverse|
 * |:----------------------------------:|:---------:|-------------------------------|---------------------------------------|---------|-------|
 * |0 (MEANING.PROTO)                            |_PROTO    |2 (KIND.TYPE)                  |0 (*PROTO*)                            |         |false  |
 * |1 (MEANING.NORMAL)                         |_<user\>_ |1 (KIND.LINK)                  |                                       |         |       |
 * |2 (MEANING.)                         |_<user\>_ |1 (KIND.LINK)                  |                                       |         |       |
 * |3 (MEANING.)                         |_<user\>_ |1 (KIND.LINK)                  |                                       |         |       |
 * |5 (MEANING.)                         |_<user\>_ |1 (KIND.LINK)                  |                                       |         |       |
 * |6 (*NORMAL*)                         |_<user\>_ |1 (KIND.LINK)                  |                                       |         |       |
 * @enum
 * @readonly
 */
const MEANING = {
    /**
     * A prototype link (that serves as a link type description).
     * * Kind will be 2, see {@link module:brain~KIND|KIND.TYPE}MEANING.
     * * Relation will be 0, see {@link module:brain~RELATION|RELATION.PROTO}
     * @type {module:brain~MeaningDescriptor}
     */
    PROTO: new MeaningDescriptor({
        code: 0,
        label: '_PROTO',
        Kind: KIND.TYPE,
        Relation: [RELATION.PROTO]
    }),

    /**
     * A normal link between normal nodes.
     * * Kind will be 1, see {@link module:brain~KIND|KIND.NORMAL}
     * * Relation will be either 1 or 3,
     * ** see {@link module:brain~RELATION|RELATION.HIERARCHY}
     * ** see {@link module:brain~RELATION|RELATION.JUMP}
     * @type {module:brain~MeaningDescriptor}
     */
    NORMAL: new MeaningDescriptor({
        code: 1,
        Kind: KIND.LINK,
        Relation: [RELATION.HIERARCHY, RELATION.JUMP]
    }),

    /**
     * A link from a type node to a member of that type. (The opposite direction from a type pointer).
     * * Kind: will be 2, see {@link module:brain~KIND|KIND.TYPE}
     * * Relation: will be 1, see {@link module:brain~RELATION|RELATION.HIERARCHY}
     * @type {module:brain~MeaningDescriptor}
     */
    MEMBER: new MeaningDescriptor({
        code: 2,
        label: '_TYPE',
        reverse: true,
        Kind: KIND.TYPE,
        Relation: [RELATION.HIERARCHY],
        Direction: FLAG_VAL_UNSPECIFIED
    }),

    /**
     * A link from a type to a subtype. (The opposite direction from a supertype pointer).
     * * Kind: will be 1, see {@link module:brain~KIND|KIND.LINK}
     * * Relation: will be 1 see {@link module:brain~RELATION|RELATION.HIERARCHY}
     * * Direction: will be -1 (unspecified).
     * @type {module:brain~MeaningDescriptor}
     */
    SUBTYPE: new MeaningDescriptor({
        code: 3,
        label: '_SUPER',
        reverse: true,
        Kind: KIND.LINK,
        Relation: [RELATION.HIERARCHY],
        Direction: FLAG_VAL_UNSPECIFIED
    }),

    /**
     * A link fom tags to the items tagged. (The opposite direction from our model).
     * * Kind: will be 1, see {@link module:brain~KIND|KIND.LINK}
     * * Relation: will be 1, see {@link module:brain~RELATION|RELATION.HIERARCHY}
     * * Direction: will be -1
     * @type {module:brain~MeaningDescriptor}
     */
    TAG: new MeaningDescriptor({
        code: 5,
        label: '_TAG',
        reverse: true,
        Kind: KIND.LINK,
        Relation: [RELATION.HIERARCHY],
        Direction: FLAG_VAL_UNSPECIFIED
    }),

    /**
     * A link to pinned posts, from the node named "Pinned".
     * * Kind: will be 1, see {@link module:brain~KIND|KIND.LINK}
     * * Relation: will be 1, see {@link module:brain~RELATION|RELATION.HIERARCHY}
     * * Direction; will be -1
     * @type {module:brain~MeaningDescriptor}
     */
    PIN: new MeaningDescriptor({
        code: 6,
        label: '_PIN',
        Kind: KIND.LINK,
        Relation: [RELATION.HIERARCHY],
        Direction: FLAG_VAL_UNSPECIFIED
    })
};

/**
 * Array from Meaning: to the entry in {@link module:brain~MEANING|MEANING}, indexed by value.
 * @type {MeaningDescriptor[]}
 */
const MEANING_IDS = Array(7);
R.forEachObjIndexed((val, key) => {
    MEANING_IDS[val.code] = val;
    val.key = key;
})(MEANING);


module.exports = {
    MEANING,
    MEANING_IDS,
    ID_NULL_NODE,
    KIND,
    RELATION,
    FLAG_DIRECTIONAL,
    FLAG_REVERSED,
    FLAG_ONE_WAY,
    FLAG_SPECIFIED
};



/**
 * @typedef {string} UUID;
 */

/**
 * Time in ISO format (UTC): 2018-05-31T06:36:27.72387
 * @typedef {string} TIMESTAMP;
 */


/**
 * Description of TheBrain's export format for nodes.
 * @typedef {Object} module:brain.Node
 * @property {UUID}                Id                    - Unique Id for this node.
 * @property {enum_Kind}           Kind                  - Enumeration giving the {@link module:brain~KIND|kind of node}.
 * @property {string}              Name                  - Displayed node name.
 * @property {string}              [Label]               - Additional info for search and mouse hover
 * @property {UUID}                [TypeId]              - Id of the type node for this node. Not present if no type is assigned.
 * @property {TIMESTAMP}           CreationDateTime      - Time this node was created.
 * @property {TIMESTAMP}           ModificationDateTime  - Time this node was last modified.
 */


/**
 * Description of TheBrain's export format for links.
 * @typedef {Object} module:brain.Link
 * @property {UUID}                Id                    - Unique Id for this node.
 * @property {UUID}                ThoughtIdA            - Unique Id for the source node.
 * @property {UUID}                ThoughtIdB            - Unique Id for the destination node.
 * @property {enum_Kind}           Kind                  - Enumeration giving the kind of link.
 *                                                         See {@link module:brain~KIND}.
 * @property {enum_Meaning}        Meaning               - Enumeration giving the detailed role of this link.
 *                                                         See {@link module:brain~MEANING}.
 * @property {enum_Relation}       Meaning               - Enumeration giving how the link connects to the node.
 *                                                         See {@link module:brain~RELATION|RELATION}.
 * @property {flag_Direction}      Direction             - Displayed direction info for this link.
 *                                                         See {@link module:brain~flag_Direction|Direction flags}
 * @property {string}              Name                  - Displayed link name.
 * @property {UUID}                [TypeId]              - Id of the prototype link for this link.
 *                                                         Not present if no type is assigned.
 * @property {TIMESTAMP}           CreationDateTime      - Time this link was created.
 * @property {TIMESTAMP}           ModificationDateTime  - Time this link was last modified. */


/**
 * Unspecified is -1
 * @see module:brain~FLAG_SPECIFIED
 * @see module:brain~FLAG_ONE_WAY
 * @see module:brain~FLAG_DIRECTIONAL
 * @see module:brain~FLAG_REVERSED
 * @memberOf module:brain~Link
 * @name Direction
 * @type number
 */

