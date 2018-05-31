/*
 * Copyright (c) 2018 Bob Kerns.
 */

const R = require('ramda');



const KIND = {
    NODE: 1,     // Applies to normal nodes
    LINK: 1,     // Applies to normal links (same code, different file & format)
    TYPE: 2,     // Applies to both node types and link types.
    TAG: 4,
    SPECIAL: 5  // e.g Pinned
};

const RELATION = {
    PROTO: 0,      // Only for prototype links (link types). These link to and from the nul object.
    HIERARCHY: 1,  // Hierarchical links
    JUMP: 3        // Jump links (i.e. horizontal, non-hierarchical)
    };

const ID_NULL_NODE = '00000000-0000-0000-0000-000000000000';

const FLAG_DIRECTIONAL = 1;
const FLAG_REVERSED = 2;
const FLAG_ONE_WAY = 4;
const FLAG_SPECIFIED = 8;

/**
 * Interpretation of the Meaning: attribute in Brain links
 */
const MEANING = {
    /**
     * A prototype link (that serves as a link type description).
     * * Kind will be 2, @{see KIND.TYPE}
     * * Relation will be 0, @{see RELATION.PROTO}
     */
    PROTO: {
        code: 0,
        label: '_PROTO',
        Kind: KIND.TYPE,
        Relation: [RELATION.PROTO]
    },
    /**
     * A normal link between normal nodes.
     * * Kind will be 1, @{see Kind.NORMAL}
     * Relation will be either 1 or 3, @{see RELATION.HIERARCHY}, @{see RELATION.JUMP}
     */
    NORMAL: {
        code: 1,
        Kind: KIND.LINK,
        Relation: [RELATION.HIERARCHY, RELATION.JUMP]
    },
    /**
     * A link from a type node to a member of that type. (The opposite direction from a type pointer).
     * * Kind: will be 2, @{see KIND.TYPE}
     * * Relation: will be 1, {@see RELATION.HIERARCHY}
     */
    MEMBER: {
        code: 2,
        label: '_TYPE',
        reverse: true,
        Kind: KIND.TYPE,
        Relation: [RELATION.HIERARCHY],
        Direction: -1
    },
    /**
     * A link from a type to a subtype. (The opposite direction from a supertype pointer).
     * * Kind: will be 1 @{see KIND.LINK}
     * * Relation: will be 1 @{see RELATION.HIERARCHY}
     * * Direction: will be -1 (unspecified)
     */
    SUBTYPE: {
        code: 3,
        label: '_SUPER',
        reverse: true,
        Kind: KIND.LINK,
        Relation: [RELATION.HIERARCHY],
        Direction: -1
    },

    /**
     * A link fom tags to the items tagged. (The opposite direction from our model).
     * * Kind: will be 1, @{see KIND.LINK}
     * * Relation: will be 1, @{see RELATION.HIERARCHY}
     * * Direction: will be -1
     */
    TAG: {
        code: 5,
        label: '_TAG',
        reverse: true,
        Kind: KIND.LINK,
        Relation: RELATION.HIERARCHY,
        Direction: -1
    },
    /**
     * A link to pinned posts, from the node named "Pinned".
     * * Kind: will be 1, @{see KIND.LINK}
     * * Relation: will be 1, {see RELATION.HIERARCHY}
     * * Direction; will be -1
     */

    PIN: {
        code: 6,
        label: '_PIN'
    }
};

/**
 * Array from Meaning: to the entry in @{see MEANING}, indexed by value.
 * @type {any[]}
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
 * Description of TheBrain's export format for nodes.
 * @name Node
 * @interface
 */

/**
 * @see KIND
 * @memberOf Node
 * @name Kind
 * @type number
 */

/**
 * @memberOf Node
 * @name Name
 * @type string
 */

/**
 * @memberOf Node
 * @name Label
 * @type string
 */

/**
 * @memberOf Node
 * @name TypeId
 * @type String
 */

/**
 * @memberOf Node
 * @name Id
 * @type String
 */

/**
 * @memberOf Node
 * @name CreationDateTime
 * @type String
 */

/**
 * @memberOf Node
 * @name ModificationDateTime
 * @type String
 */

/**
 * Description of TheBrain's export format for links.
 * @name Link
 * @interface
 */

/**
 * @see Kind
 * @memberOf Link
 * @name Kind
 * @type number
 */

/**
 * Links only have a Name, not a Label.
 * @memberOf Link
 * @name Name
 * @type string
 */

/**
 * @see MEANING
 * @memberOf Link
 * @name Meaning
 * @type number
 */

/**
 * Unspecified is -1
 * @see FLAG_SPECIFIED
 * @see FLAG_ONE_WAY
 * @see FLAG_DIRECTIONAL
 * @see FLAG_REVERSED
 * @memberOf Link
 * @name Direction
 * @type number
 */

/**
 * @see RELATION
* @memberOf Link
* @name Relation
* @type number
*/

/**
 * @memberOf Link
 * @name TypeId
 * @type String
 */

/**
 * @memberOf Link
 * @name Id
 * @type String
 */

/**
 * @memberOf Link
 * @name CreationDateTime
 * @type String
 */

/**
 * @memberOf Link
 * @name ModificationDateTime
 * @type String
 */

/**
 * @memberOf Link
 * @name ThoughtIdA
 * @type String
 */

/**
 * @memberOf Link
 * @name ThoughtIdB
 * @type String
 */

