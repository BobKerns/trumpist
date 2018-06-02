/*
 * Copyright (c) 2018 Bob Kerns.
 */
/**
 * Description and access to the nodes and links of TheBrain.
 * =====
 *
 * This describes the data as exported into a zip file, with the sqlite3 data exported as json files.
 *
 * ____
 * File Organization
 * ----
 * Within the zip file, are a collection of subdirectories named with node and link IDs, and at top level,
 * the following items:
 *
 * | File / Directory      | File          | File       | Purpose
 * |-----------------------|---------------|------------|-----------------------------------------------------------------
 * | meta.json             |               |            | Contains the ExchangeFormatVersion (currently 4) and a 1 bit for thoughts with attachments?
 * | thoughts.json         |               |            | The [Node]{@link module:brain.Node} data
 * | links.json            |               |            | The [Link]{@link module:brain.Link} data
 * | settings.json         |               |            | Various opaque settings for the brain. The initial node is indicated by [ID_SETTING_INIT]{@link module:brain.ID_SETTING_INIT}
 * | attachments.json      |               |            | Metadata about each attachment
 * | modificationlogs.json |               |            | History and undo
 * | brainusers.json       |               |            | Username, email, first, last
 * | syncpoints.json       |               |            | History of synchronizations with the cloud server
 * | tombstones.json       |               |            | Shares IDs with modificationlogs, adds timestamp and typecode.
 * | calendarevents.json   |               |            | Information about TheBrain event items, and sync with external calendars
 * | access.json           |               |            | Presumably, information about sharing?
 * | _brainID/_            | wallpaper.png |            | Wallpaper image displayed behind the graph
 * |                       |               |            | Wallpaper image displayed behind the graph
 * | _node or link ID/_    |               |            | For nodes or links with attachments, including notes and custom icons
 * |                       | _attachment_  |            | File attachment (e.g. pdf, html)
 * |                       | .data/        |
 * |                       | .data/        | Icon.png   | Attached icon
 * |                       | notes/        |
 * |                       |               | notes.html | If notes are attached, an HTML fragment. Images, etc. are also located in this directory
 *
 * ____
 * Data Model
 * -----
 *
 *  TheBrain data model consists of [Nodes]{@link module:brain.Node}, [Links]{@link module:brain.Link}, and attachments.
 *  The user model has typed links between the regular nodes (called "Thoughts"). In the user interface, each node has
 *  three attachment points, or "gates".
 *
 *  The gates at the top and bottom are for hierarchical linking. Each bottom gate connects to top gates on other nodes.
 *  If you draw a family tree, you'd have a link from each the
 *  bottom gate on each parent, to the top gate on each child. These always go from parent to child, though they may be
 *  displayed either without a direction arrow, or with it reversed. The parent is always displayed above the child.
 *
 *  The gate on the side ("jump gate") is for non-hierarchical links. Any side gate can be connected to any other
 *  side gate, in either direction. There is always a direction, but it is not shown by default. As for links in the
 *  hierarchy, the side gates can show their direction reversed from the underlying direction.
 *
 *  In the data model, however, there are no gates. Rather, links are classed into hierarchical and non-hierarchical
 *  (among other attributes) by way of the [Relation:]{@link module:brain~RELATION} field.
 *
 *  The user interface also provides tags, names and labels for nodes, labels for links, and attachments, as can be seen
 *  in the following screenshot.
 *
 *  ![TheBrain Screenshot](screenshot.png)
 *
 *  The nodes arrayed along the top of the screen are called "pins", and provide quick access to a few selected nodes.
 *  We will discuss them more later, as they are part of the data model.
 *
 *  The nodes along the bottom are breadcrumbs, are per-session, so not part of the data model.
 *
 *
 * The main data consists of:
 * * [Node]{@link module:brain.Node} data, including user visible nodes, types, tags etc.
 * * [Link]{@link module:brain.Link} data connecting the various nodes
 *
 *
 *  All objects in the data model are identified by an Id in the form of a [UUID]{@link module:brain.UUID} string.
 *  Each instance of a TheBrain collection ("brain") is identified with a [UUID]{@link module:brain.UUID} in the
 *  BrainId field.
 *
 * [Node]{@link module:brain~Node} Details
 * ----
 *
 * Nodes have a number of attributes, which can be seen here:
 * ![Node Editor](node-info.png)
 *
 * * In the upper left, we have an icon (a kind of attachment).
 * * A name ("Dan Coats"). This is how the node is normally displayed (abbreviated if necessary).
 * * A label ("Director of National Intelligence"). This is presented in hovers, can be searched, etc.
 * * Foreground and background colors for displaying th node. (These may be inherited from the type).
 * * A lock/unlock icon, denoting whether it is public or private.
 * * A node type ("Intelligence"). This is represented as a separate node.
 *   * The two icons to the left bring up a menu, and edit history for this node.
 *   * The edit button to the right takes you to edit the type node ("Intelligence", in this case).
 * * "GOP, Investigator" are a list of tags. These are actually separate nodes, specially linked.
 *   * These are typically displayed as icons or small text on the lower right of the node.
 * * Modification and Creation timestamps.
 * * The ID of the node.
 *
 * ____
 * [Link]{@link module:brain~Link} Details
 * ----
 *
 * Links always have a direction, from "ThoughtA" to "ThoughtB". They can be displayed without a direction, or with the
 * direction reversed.
 *
 * Unlike nodes, they only have a Name: field, not a Label: field. The Name: field is displayed as a label on the arc,
 * if present. If not, if the link has a type, the type is used, or no label is drawn.
 *
 * Links may have a color, used for drawing the line.
 *
 * In addition to the links between user nodes, links are used behind the scenes for connecting to node types, denoting
 * the type hierarchy, and pinned.
 *
 * Valid combinations of flags on [Links]{@link module:brain~Link}
 *
 *
 * |[Meaning:]{@link module:brain.Link.MEANING}|label    |[Kind]{@link module:brain~KIND}|[Relation]{@link module:brain.Link.RELATION}|Direction  |reverse|
 * |:-----------------------------------------:|:-------:|-------------------------------|--------------------------------------------|-----------|-------|
 * |0 (MEANING.PROTO)                          |_PROTO   |2 (KIND.TYPE)                  |0 (PROTO)                                   |-1,5,8,9   |false  |
 * |1 (MEANING.NORMAL)                         |_<user\>_|1 (KIND.LINK)                  |1 (HIERARCHY)<br>3 (JUMP)                   |-1,5,8,9,11|false  |
 * |2 (MEANING.MEMBER)                         |_TYPE    |2 (KIND.TYPE)                  |1 (HIERARCHY)                               | -1        |true   |
 * |3 (MEANING.SUBTYPE)                        |_SUPER   |1 (KIND.LINK)                  |1 (HIERARCHY)                               | -1        |true   |
 * |5 (MEANING.TAG)                            |_TAG     |1 (KIND.LINK)                  |1 (HIERARCHY)                               | -1        |true   |
 * |6 (MEANING.PIN)                            |_PIN     |1 (KIND.LINK)                  |1 (HIERARCHY)                               | -1        |false  |
 *
 * Here, the "label" column refers to a label we apply for this case, not the Label: field in the brain node data.
 * ____
 * Node Types
 * ----
 * User nodes ("thoughts") are typed, with the type being represented by a type node, which in turn are arranged
 * in a hierarchy.
 *
 * ![Type hierarchy](type-hierarchy.png)
 *
 * Here, "Intelligence", "USOfficial", and "USPerson" are type nodes; "Dan Coats" is a "thought" or regular node.
 * The Intelligence type links to "Dan Coats" by a [MEANING.MEMBER]{@link module:brain.Link.MEANING} link, extending
 * from type to instance.
 *
 * Similarly, each super type links to each of its subtypes. (This is the reverse of most object-oriented systems).
 * These links are tagged with [MEANING.SUBTYPE]{@link module:brain.Link.MEANING}.
 *
 * Each typed node has a TypeId: field. This is the same information that can be found by following the
 * [MEANING.MEMBER]{@link module:brain.Link.MEANING} link back to the type. However, it is easier and faster to look up
 * an ID, and consistent with how link types are found (links do not have type nodes, but rather prototype links).
 * ____
 * Tags
 * ----
 * Tags are represented as nodes, with a link from the tag to each node tagged wih that node.
 *
 * The Tag nodes have a [Kind:]{@link module:brain.Node}.{@link module:brain~KIND} field set to
 * [KIND.TAG]{@link module:brain~KIND}, but they are otherwise ordinary nodes.
 *
 * Each tag is linked to each node having that tag (as opposed to the other way around). As you can see, there can be
 * a very large number of links from each tag. Each node has a TagIds: field, but it is always an empty array.
 * ____
 * Pins
 * ----
 * Pins are denoted by linking from a singleton node named "Pinned", with Kind: [KIND.SPECIAL]{@link module:brain~KIND},
 * and a link with Meaning: [MEANING.PIN]{@link module:brain.Link.MEANING}.
 *
 * > Note: These names are the arbitrary result of reverse engineering of the data. Both could be SPECIAL or both PIN,
 * > depending on how TheBrain chooses to evolve.
 * ____
 * ____
 * @module brain
 */

const R = require('ramda');

/**
 * Values for the Kind: member in ThBrain's data exports for links.
 *
 * This is used in both links and nodes.
 * @typedef {number} module:brain~enum_Kind
 * @see module:brain~KIND
 * @see module:brain.Node
 * @see module:brain.Link
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
 * @see module:brain.Node
 * @see module:brain.Link
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
 * @typedef {number} module:brain.Link~enum_Relation
 * @see [Link.RELATION]{@link module:brain.Link.RELATION} for the specific values
 */

/**
 * Values for the Relation: member inTheBrain's data exports for links.
 * @type {{
 *     PROTO: module:brain.Link~enum_Relation,
 *     HIERARCHY: module:brain.Link~enum_Relation,
 *     JUMP: module:brain.Link~enum_Relation}}
 * @enum
 * @readonly
 * @memberOf module:brain.Link
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
 * The ID of the setting in meta.json that indicates the initial node to display.
 * @type {module:brain.UUID}
 * @memberOf module:brain
 * @public
 */
// eslint-disable-next-line no-unused-vars
const ID_SETTING_INIT = 'a395b570-4456-519c-b534-af7b81b5aaf1';

/**
 * A flag word describing which direction the arrow should point.
 * @typedef {number} module:brain.Link~flag_Direction
 * @see module:brain.Link.FLAG_SPECIFIED
 * @see module:brain.Link.FLAG_ONE_WAY
 * @see module:brain.Link.FLAG_DIRECTIONAL
 * @see module:brain.Link.FLAG_REVERSED
 */

/**
 * @summary The link is asymmetric and should show an arrowhead
 * @memberOf module:brain.Link
 * @type {module:brain.Link~flag_Direction}
 */
const FLAG_DIRECTIONAL = 1;
/**
 * @summary The link is reversed compared to the prototype/link type
 * @memberOf module:brain.Link
 * @type {module:brain.Link~flag_Direction}
 */
const FLAG_REVERSED = 2;
/**
 * @summary The link is marked "one way" and should not be followed in the reverse direction
 * @memberOf module:brain.Link
 * @type {module:brain.Link~flag_Direction}
 */
const FLAG_ONE_WAY = 4;
/**
 * The link has had its direction specified, overriding the default from prototype or general.
 * @memberOf module:brain.Link
 * @type {module:brain.Link~flag_Direction}
 */
const FLAG_SPECIFIED = 8;

/**
 * Value used to indicate no value has been supplied
 * @memberOf module:brain.Link
 * @type {module:brain.Link~flag_Direction}
 */
const FLAG_VAL_UNSPECIFIED = -1;

/**
 * Enumeration of the Meaning: attribute in Brain links
 * @typedef {number} module:brain.Link~enum_Meaning
 * @see [MEANING]{@link module:brain.Link.MEANING) for details including numeric values
 */

/**
 * Entries in the {@link module:brain.Link.MEANING|MEANING} table.
 * @property {module:brain.Link~enum_Meaning}   code            - The numeric value of the Meaning: enumeration.
 *                                                                See {@link module:brain.Link~enum_Meaning|enum_Meaning}.
 * @property {string}                           [label]         - The hardwired string label to use on these arrows.
 *                                                                Omitted for user-defined
 *                                                                (@link module:brain.Link.MEANING|MEANING.NORMAL}, as that
 *                                                                will be the user-defined type.
 * @property {module:brain~enum_Kind}           Kind            - The numeric value of the Kind: attribute used with
 *                                                                this Meaning:
 *                                                                See {@link module:brain~enum_Kind|enum_Kind}.
 * @property {module:brain.Link~enum_Relation}  Relation        - An array of the allowed values for the Relation:
 *                                                                attribute.
 *                                                                See {@link module:brain.Link~enum_Relation|enum_Relation}
 * @property {module:brain.Link~flag_Direction} Direction       - A {@link module:brain.Link~flag_Direction|number decoded
 *                                                                bitwise} indicating which direction, if any, the
 *                                                                arrows should point.
 * @property {boolean}                          [reverse=false] - True if our representation is reversed in direction
 *                                                                from TheBrain's
 * @memberOf module:brain.Link
 */

class MeaningDescriptor {
    constructor(options) {
        Object.assign(this, options);
    }
}

/**
 * Interpretation of the Meaning: attribute in Brain links.
 *
 * @enum
 * @readonly
 * @memberOf module:brain.Link
 */
const MEANING = {
    /**
     * A prototype link (that serves as a link type description).
     * * Kind will be 2, see {@link module:brain~KIND|KIND.TYPE}MEANING.
     * * Relation will be 0, see {@link module:brain~RELATION|RELATION.PROTO}
     * @type {module:brain.Link.MeaningDescriptor}
     */
    PROTO: new MeaningDescriptor({
        code: 0,
        label: '_PROTO',
        reverse: false,
        Kind: KIND.TYPE,
        Relation: [RELATION.PROTO]
    }),

    /**
     * A normal link between normal nodes.
     * * Kind will be 1, see {@link module:brain~KIND|KIND.NORMAL}
     * * Relation will be either 1 or 3,
     * ** see {@link module:brain~RELATION|RELATION.HIERARCHY}
     * ** see {@link module:brain~RELATION|RELATION.JUMP}
     * @type {module:brain.Link.MeaningDescriptor}
     */
    NORMAL: new MeaningDescriptor({
        code: 1,
        Kind: KIND.LINK,
        reverse: false,
        Relation: [RELATION.HIERARCHY, RELATION.JUMP]
    }),

    /**
     * A link from a type node to a member of that type. (The opposite direction from a type pointer).
     * * Kind: will be 2, see {@link module:brain~KIND|KIND.TYPE}
     * * Relation: will be 1, see {@link module:brain~RELATION|RELATION.HIERARCHY}
     * @type {module:brain.Link.MeaningDescriptor}
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
     * @type {module:brain.Link.MeaningDescriptor}
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
     * @type {module:brain.Link.MeaningDescriptor}
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
     * @type {module:brain.Link.MeaningDescriptor}
     */
    PIN: new MeaningDescriptor({
        code: 6,
        label: '_PIN',
        Kind: KIND.LINK,
        reverse: false,
        Relation: [RELATION.HIERARCHY],
        Direction: FLAG_VAL_UNSPECIFIED
    })
};

/**
 * Array from Meaning: field values to the entry in {@link module:brain.Link.MEANING|MEANING} that describes it,
 * indexed by value.
 * @type {module:brain.Link~MeaningDescriptor[]}
 * @memberOf module:brain.Link
 */
const MEANING_IDS = Array(7);
R.forEachObjIndexed((val, key) => {
    MEANING_IDS[val.code] = val;
    val.key = key;
})(MEANING);

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

