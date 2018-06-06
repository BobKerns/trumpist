/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {Transform} from "stream";
import {AnyParams} from "./types";

export interface Parser extends Transform {

}

export interface Stringifyer extends Transform {

}

const {stringify_any, parse_any} = require("jsonlines");

export const stringify = stringify_any as () => Stringifyer;


export const parse: (options: AnyParams) => Parser = parse_any as (options: AnyParams) => Parser;
