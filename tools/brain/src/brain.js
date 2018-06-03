/*
 * Copyright (c) 2018 Bob Kerns.
 */
/**
 * @module brain
 */

/**
 * @internal
 */
let R = require('ramda');


/**
 * {@link module:brain.Node.ACTYPE.PUBLIC} = 0, {@link module:brain.Node.ACTYPE.PRIVATE} = 1
 * @typedef {number} module:brain.Node~enum_ACType
 * @memberOf module:brain.Node
 * @see module:brain.Node.ACTYPE
 */

/**
 * Values for the ACType: flag.
 * @type {{
 *    PUBLIC: module:brain.Node~enum_ACType,
 *    PRIVATE: module:brain.Node~enum_ACType
 * }}
 * @enum
 * @memberOf module:brain.Node
 * @see module:brain.Node~enum_ACType
 */
const ACTYPE = {
    /**
     * Node is sharable with the public on the web
     * @type {module:brain.Node~enum_ACType}
     */
    PUBLIC: 0,
    /**
     * Node is not shared.
     * @type {module:brain.Node~enum_ACType}
     */
    PRIVATE: 1
};

module.exports = {
    MEANING,
    MEANING_IDS,
    ID_NULL_NODE,
    KIND,
    ACTYPE,
    RELATION,
    FLAG_DIRECTIONAL,
    FLAG_REVERSED,
    FLAG_ONE_WAY,
    FLAG_SPECIFIED
};


/**
 * Abstract type; a regular UUID represented as a string. This is used throughout as an object ID.
 * @typedef {string} module:brain.UUID
 */

/**
 * Time in ISO format (UTC): 2018-05-31T06:36:27.72387. Used throughout as object creation/modification timestamp.
 * @typedef {string} module:brain.TIMESTAMP
 */

/**
 * Color, as a signed integer value. (I have not investigated the format—possibly sign-extended RGBA?)
 * @typedef {number} module:brain.Color
 */

/**
 * Thickness, as a signed integer value. -1 for unspecified, else a number in the 100s.
 * @typedef {number} module:brain.Thickness
 */


/**
 * Description of TheBrain's export format for nodes.
 * @interface module:brain.Node
 * @property {module:brain.UUID}             Id                    - Unique Id for this node.
 * @property {module:brain~enum_Kind}        Kind                  - Enumeration giving the kind of node.
 *                                                                   See {@link module:brain~KIND|kind of node}.
 * @property {string}                        Name                  - Displayed node name.
 * @property {string}                        [Label]               - Additional info for search and mouse hover
 * @property {module:brain.UUID}             [TypeId]              - Id of the type node for this node. Not present if no type
 *                                                                   is assigned.
 * @property {module:brain.UUID[]}           TagIds                - Always an empty array.
 * @property {module:brain.UUID}             BrainId               - Id of the the brain. Tbe same for all nodes and links.
 * @property {module:brain.Node.enum_ACType} ACType                - Access Control type
 *                                                                   ({@link module:brain.Node.ACTYPE|ACTYPE.PUBLIC|PRIVATE})
 * @property {module:brain.Color}       [ForegroundColor]          - Color of the text
 * @property {module:brain.Color}       [BackgroundColor]          - Color of the background
 * @property {module:brain.TIMESTAMP}   CreationDateTime           - Time this node was created.
 * @property {module:brain.TIMESTAMP}   ModificationDateTime       - Time this node was last modified.
 */


/**
 * Description of TheBrain's export format for links.
 * @interface module:brain.Link
 * @property {module:brain.UUID}                 Id                    - Unique Id for this node.
 * @property {module:brain.UUID}                 ThoughtIdA            - Unique Id for the source node.
 * @property {module:brain.UUID}                 ThoughtIdB            - Unique Id for the destination node.
 * @property {module:brain~enum_Kind}            Kind                  - Enumeration giving the kind of link.
 *                                                                       See {@link module:brain~KIND|KIND}.
 * @property {module:brain.Link~enum_Meaning}   Meaning                - Enumeration giving the detailed role of this link.
 *                                                                       See {@link module:brain.Link.MEANING|Link.MEANING}.
 * @property {module:brain.Link~enum_Relation}  Relation               - Enumeration giving how the link connects to the
 *                                                                       node.
 *                                                                       See {@link module:brain.Link.RELATION|Link.RELATION}.
 * @property {module:brain.Link~flag_Direction} Direction              - Displayed direction info for this link.
 *                                                                       See {@link module:brain.Link~flag_Direction|Link Direction flags}
 * @property {string}                           [Name]                 - Displayed link name.
 * @property {module:brain.Color}               [Color]                - Color of the line
 * @property {module:brain.Thickness}           Thickness              - Line width
 * @property {module:brain.UUID}                [TypeId]               - Id of the prototype link for this link.
 *                                                                       Not present if no type is assigned.
 * @property {module:brain.TIMESTAMP}           CreationDateTime       - Time this link was created.
 * @property {module:brain.TIMESTAMP}           ModificationDateTime   - Time this link was last modified. */


/**
 * Unspecified is -1
 * @see module:brain.FLAG_SPECIFIED
 * @see module:brain.FLAG_ONE_WAY
 * @see module:brain.FLAG_DIRECTIONAL
 * @see module:brain.FLAG_REVERSED
 * @memberOf module:brain.Link
 * @name Direction
 * @type number
 */

