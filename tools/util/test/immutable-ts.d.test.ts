/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as TS from "../immutable-ts";
import * as JS from "immutable";

import {accepting, producing} from "../type-test-aids";

// @dts-jest:group Immutable types typed.

// @dts-jest:pass:snap:show List type retyped
producing<TS.List<string>>();

// @dts-jest:pass:snap:show List type compatibiliy 1
accepting<JS.List<string>>(() => producing<TS.List<string>>());

// @dts-jest:pass:snap:show List type compatibiliy 2
accepting<TS.List<string>>(() => producing<JS.List<string>>());
