/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as TS from "../immutable-ts";
import {path} from "../immutable-ts";
import * as JS from "immutable";

import {accepting, producing} from "../type-test-aids";

// @dts-jest:group Immutable types typed.

// @dts-jest:pass:snap List type retyped
producing<TS.List<string>>();

// @dts-jest:fail:snap List type incompatibiliy: TS typing does not support JS calls.
accepting<JS.List<string>>(() => producing<TS.List<string>>());

// @dts-jest:pass:snap List type compatibiliy: JS typing suppots all TS calls.
accepting<TS.List<string>>(() => producing<JS.List<string>>());


// @dts-jest:group Immutable Records
interface RwTest {
    a: string;
    b: string;
}

type RwTestW = 'b';

// @dts-jest:pass:snap Record Factory R/W
const factory1: TS.Record.Factory<RwTest> = TS.Record<RwTest>({a: "foo", b: "bar"});

// @dts-jest:pass:snap Record Construcion R/W
const record1: TS.Record<RwTest> = factory1({b: "baz"});

// @dts-jest:pass:snap Record Key Typing R/W get positive
accepting(() => record1.get('a'));

// @dts-jest:pass:snap Record Key Typing R/W getIn positive
accepting(() => record1.getIn(path<RwTest>()('a')().path));

// @dts-jest:fail Record Key Typing R/W get negative
accepting(() => record1.getIn(path<RwTest>()('a')('a')().path));

// @dts-jest:fail:snap Record Key excludes non-record keys
accepting(() => record1.get('set'));

// @dts-jest:pass:snap Record Factory W
const factory2: TS.Record.Factory<RwTest, RwTestW> = TS.Record<RwTest, RwTestW>({a: "foo", b: "bar"});

// @dts-jest:pass:snap Record Construcion W
const record2: TS.Record<RwTest, RwTestW> = factory2({b: "baz"});

// @dts-jest:pass:snap Record Key Typing W get positive
accepting<string>(() => record2.get('a'));

// @dts-jest:fail:snap Record Key Typing W get negative
accepting(() => record2.get('X'));

// @dts-jest:fail:snap Record Key Typing W set negative
accepting(() => record2.set('a', "foo"));

// @dts-jest:pass:snap Record Key Typing W set positive
accepting<TS.Record<RwTest, RwTestW>>(() => record2.set('b', "bar"));

// @dts-jest:pass:snap Record Direct Access Read
accepting<string>(() => record2.a);

// @dts-jest:fail:snap Record Direct Access Read
accepting(() => record2.a = "no");

