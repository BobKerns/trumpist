/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {Transform} from "stream";
import {AnyParams} from "./types";

export interface Parser extends Transform {

}

export interface Stringifyer extends Transform {

}

/* tslint:disable-next-line no-var-requires */
const jsl: {[k: string]: any} = require("jsonlines");

const {stringify: stringify_any, parse: parse_any} = jsl;

export const stringify = stringify_any as typeof stringify_any;


export const parse: (options?: AnyParams) => Parser = parse_any as typeof parse_any;
