/*
 * Copyright (c) 2018 Bob Kerns.
 */

const R = require('ramda');

// Interpretation of the Meaning: attribute in Brain links
const MEANING = {
    PROTO: {code: 0, label: '_PROTO'},
    NORMAL: {code: 1},
    MEMBER: {code: 2, label: '_TYPE', reverse: true},
    SUBTYPE: {code: 3, label: '_SUPER', reverse: true},
    TAG: {code: 5, label: '_TAG', reverse: true},
    PIN: {code: 6, label: '_PIN'}
};

const MEANING_IDS = Array(7);
R.forEachObjIndexed((val, key) => {
    MEANING_IDS[val.code] = val;
    val.key = key;
})(MEANING);

const ID_NULL_NODE = '00000000-0000-0000-0000-000000000000';

const FLAG_DIRECTIONAL = 1;
const FLAG_REVERSED = 2;
const FLAG_ONE_WAY = 4;
const FLAG_SPECIFIED = 8;


module.exports = {
    MEANING,
    MEANING_IDS,
    ID_NULL_NODE,
    FLAG_DIRECTIONAL: FLAG_DIRECTIONAL,
    FLAG_REVERSED,
    FLAG_ONE_WAY,
    FLAG_SPECIFIED
};

/**
 * @name Link
 * @interface
 */

/**
 * @memberOf Link
 * @name Kind
 * @type number
 */

/**
 * @memberOf Link
 * @name Label
 * @type string
 */

/**
 * @memberOf Link
 * @name Meaning
 * @type number
 */

/**
 * @memberOf Link
 * @name Direction
 * @type number
 */

/**
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