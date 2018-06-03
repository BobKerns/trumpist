/*
 * Copyright (c) 2018 Bob Kerns.
 */
System.register([], function (exports_1, context_1) {
    "use strict";
    var ID_SETTING_INIT, ID_NULL_NODE, KIND, ACType, RELATION, DIRECTION, MEANING, MEANING_DESCRIPTORS;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [],
        execute: function () {
            exports_1("ID_SETTING_INIT", ID_SETTING_INIT = "a395b570-4456-519c-b534-af7b81b5aaf1");
            exports_1("ID_NULL_NODE", ID_NULL_NODE = '00000000-0000-0000-0000-000000000000');
            /**
             * Values for the Kind: member in ThBrain's data exports for links.
             *
             * This is used in both links and nodes.
             * @see [[Node]]
             * @see [[Link]]
             */
            (function (KIND) {
                /**
                 * Normal user nodes
                 */
                KIND[KIND["NODE"] = 1] = "NODE";
                /**
                 * Normal user links
                 *
                 * Same value as [[KIND.NODE]], but for data loaded from a separate file.
                 */
                KIND[KIND["LINK"] = 1] = "LINK";
                /**
                 * Applies to both node types and link types.
                 */
                KIND[KIND["TYPE"] = 2] = "TYPE";
                /**
                 * A tag, or a link from a tag.
                 */
                KIND[KIND["TAG"] = 4] = "TAG";
                /**
                 * Special link for pinned items.
                 */
                KIND[KIND["SPECIAL"] = 5] = "SPECIAL";
            })(KIND || (KIND = {}));
            exports_1("KIND", KIND);
            /** Values for the ACType: flag. */
            (function (ACType) {
                /**
                 * Node is sharable with the public on the web
                 */
                ACType[ACType["PUBLIC"] = 0] = "PUBLIC";
                /**
                 * Node is not shared.
                 */
                ACType[ACType["PRIVATE"] = 1] = "PRIVATE";
            })(ACType || (ACType = {}));
            exports_1("ACType", ACType);
            ;
            /**
             * Values for the Relation: member inTheBrain's data exports for links.
             */
            (function (RELATION) {
                /**  Only for prototype links (link types). These link to and from the [[ID_NULL_NODE]]. */
                RELATION[RELATION["PROTO"] = 0] = "PROTO";
                /** Hierarchical links (vertical) */
                RELATION[RELATION["HIERARCHY"] = 1] = "HIERARCHY";
                /** Jump links (i.e. horizontal, non-hierarchical) */
                RELATION[RELATION["JUMP"] = 3] = "JUMP";
            })(RELATION || (RELATION = {}));
            exports_1("RELATION", RELATION);
            /**
             * A flag word describing which direction the arrow should point.
             * Decoded bitwise, or -1 for unspecified (and inherited or implied).
             */
            (function (DIRECTION) {
                /** Direction not specified. The actual value will be obtained from the arrow type, or not be relevant. */
                DIRECTION[DIRECTION["UNSPECIFIED"] = -1] = "UNSPECIFIED";
                /** The link is asymmetric and should show an arrowhead, */
                DIRECTION[DIRECTION["DIRECTIONAL"] = 1] = "DIRECTIONAL";
                /** The link is reversed compared to the prototype/link type. */
                DIRECTION[DIRECTION["FLAG_REVERSED"] = 2] = "FLAG_REVERSED";
                /** The link is marked "one way" and should not be followed in the reverse direction. */
                DIRECTION[DIRECTION["ONE_WAY"] = 4] = "ONE_WAY";
                /** The link has had its direction specified, overriding the default from prototype or general. */
                DIRECTION[DIRECTION["FLAG_SPECIFIED"] = 8] = "FLAG_SPECIFIED";
            })(DIRECTION || (DIRECTION = {}));
            exports_1("DIRECTION", DIRECTION);
            ;
            /**
             * Interpretation of the Meaning: attribute in Brain links.
             */
            (function (MEANING) {
                /**
                 * A prototype link (that serves as a link type description).
                 * * Kind will be 2, see [[KIND.TYPE]].
                 * * Relation will be 0, see [[RELATION.PROTO]]
                 */
                MEANING[MEANING["PROTO"] = 0] = "PROTO";
                /**
                 * A normal link between normal nodes.
                 * * Kind will be 1, see [[KIND.NORMAL]]
                 * * Relation will be either 1 or 3,
                 *   * see [[RELATION.HIERARCHY]]
                 *   * see [[RELATION.JUMP]]
                 */
                MEANING[MEANING["NORMAL"] = 1] = "NORMAL";
                /**
                 * A link from a type node to a member of that type. (The opposite direction from a type pointer).
                 * * Kind: will be 2, see [[KIND.TYPE]]
                 * * Relation: will be 1, [[RELATION.HIERARCHY]]
                 */
                MEANING[MEANING["MEMBER"] = 2] = "MEMBER";
                /**
                 * A link from a type to a subtype. (The opposite direction from a supertype pointer).
                 * * Kind: will be 1, see [[KIND.LINK]]
                 * * Relation: will be 1 see [[RELATION.HIERARCHY]]
                 * * Direction: will be -1 (unspecified).
                 */
                MEANING[MEANING["SUBTYPE"] = 3] = "SUBTYPE";
                /**
                 * A link fom tags to the items tagged. (The opposite direction from our model).
                 * * Kind: will be 1, see [[KIND.LINK]]
                 * * Relation: will be 1, see [[RELATION.HIERARCHY]]
                 * * Direction: will be -1
                 */
                MEANING[MEANING["TAG"] = 5] = "TAG";
                /**
                 * A link to pinned posts, from the node named "Pinned".
                 * * Kind: will be 1, see [[KIND.LINK]]
                 * * Relation: will be 1, see [[RELATION.HIERARCHY]]
                 * * Direction; will be -1
                 */
                MEANING[MEANING["PIN"] = 6] = "PIN"; /*: new MeaningDescriptor({
                    code: 6,
                    label: '_PIN',
                    Kind: KIND.LINK,
                    reverse: false,
                    Relation: [RELATION.HIERARCHY],
                    Direction: FLAG_VAL_UNSPECIFIED
                }) */
            })(MEANING || (MEANING = {}));
            exports_1("MEANING", MEANING);
            ;
            /**
             * Descriptors for the various [[MEANING]], describing now they related to the other properties.
             */
            exports_1("MEANING_DESCRIPTORS", MEANING_DESCRIPTORS = new Array(6));
            MEANING_DESCRIPTORS[MEANING.PROTO] = {
                label: '_PROTO',
                reverse: false,
                Kind: KIND.TYPE,
                Relation: [RELATION.PROTO]
            };
            MEANING_DESCRIPTORS[MEANING.NORMAL] = {
                Kind: KIND.LINK,
                reverse: false,
                Relation: [RELATION.HIERARCHY, RELATION.JUMP]
            };
            MEANING_DESCRIPTORS[MEANING.MEMBER] = {
                label: '_TYPE',
                reverse: true,
                Kind: KIND.TYPE,
                Relation: [RELATION.HIERARCHY],
                Direction: DIRECTION.UNSPECIFIED
            };
            MEANING_DESCRIPTORS[MEANING.SUBTYPE] = {
                label: '_SUPER',
                reverse: true,
                Kind: KIND.LINK,
                Relation: [RELATION.HIERARCHY],
                Direction: DIRECTION.UNSPECIFIED
            };
            MEANING_DESCRIPTORS[MEANING.TAG] = {
                label: '_TAG',
                reverse: true,
                Kind: KIND.LINK,
                Relation: [RELATION.HIERARCHY],
                Direction: DIRECTION.UNSPECIFIED
            };
            MEANING_DESCRIPTORS[MEANING.PIN] = {
                label: '_PIN',
                Kind: KIND.LINK,
                reverse: false,
                Relation: [RELATION.HIERARCHY],
                Direction: DIRECTION.UNSPECIFIED
            };
        }
    };
});
//# sourceMappingURL=defs.js.map