/*
 * Copyright (c) 2018 Bob Kerns.
 */

/**
 * Parse a query with substitutions of the form `$[PARAMETER]`, and produce an expansion.
 *
 * This is for queries which need to be dynamically constructed and can't be handled by the underlying DB's parameter
 * substitution.
 *
 * [[QueryParser.expand]] performs substitutions, and can be used in two ways:
 * * Expansion as a template, in which case the returned `missing` and `unused` values can be used in reporting
 *   mismatches with the parameters, and
 * * Expansion prior to delivery of the query to the underlying database, in which case the returned set of parameters
 *   are the ones not used in the expansion, and should be sent for substitution by the database.
 */
import {future, Future} from "../util/future";
import {AnyParams, never} from "../util/types";
import defineProperty = Reflect.defineProperty;
import ownKeys = Reflect.ownKeys;
import * as api from "./api";

import * as R from "ramda";
import * as util from "util";

type Pick = (params: AnyParams) => (string | undefined);
type ParseStep = string | {param: string, pick: Pick};

/**
 * Keys that can annotate paramater substitutions indicating the syntactic context.
 * E. g. `... {$[myKey:key]: $[myVal:val]}  ...`
 *
 * | `id`  | An identifier. The defaul is to surround it with backticks, and quote unusual characters with a backslash.
 * | `val` | A literal value, such as a number or a string. Strings are surounded with double quotes.
 * | `lit` | A string tha should be substituted as-is. An example might be the inclusion or not of a language keyword\
 *          modifier, such as 'UNIQUE'. The character set is limited to /^[a-zA-Z][a-zA-Z0-9_]+$/
 * | `key` | A value which is the identifier in a javascript-style object. It can remain unquoted if it fits the `lit`
 *           description above.
 *
 * The formatting and quoting can be overridden by subclasses as needed.
 */
type ParamFormat = 'id' | 'val' | 'lit' | 'key';

interface ParseResult {
    name?: string;
    steps: ParseStep[];
    parameters: string[];
}

export class QueryParser {
    public readonly statement: string;
    // noinspection TsLint
    private readonly _parsed: Future<ParseResult> = future(() => this.parse(this.statement));
    public get parsed() { return this._parsed.value; }

    constructor(statement: string) {
        this.statement = statement;
    }

    /**
     * A function to obtain the string value to substitute for a given parameter.
     * @returns A formatted string, or undefined.
     */
    private pick(paramName: string, fmt: ParamFormat): Pick {
        return(params: AnyParams) => {
            if (!params.hasOwnProperty(paramName)) { return undefined; }
            const val: any = params[paramName];
            if (val === undefined) {
                return undefined;
            } else if (!this.validate(val, fmt)) {
                throw new Error(`Invalid value for ${paramName}: ${val}`);
            }
            return this.format(val, fmt);
        };
    }

    protected parse(statement: string): ParseResult {
        let name: string | undefined = undefined;
        const nameMatch = /^\s*\[\s*([a-zA-Z0-9_]+)\s*]\s*:\s*/.exec(statement);
        if (nameMatch && nameMatch[1]) {
            name = nameMatch[1];
        }
        if (nameMatch) {
            statement = statement.substring(nameMatch[0].length);
        }
        const steps: ParseStep[] = [];
        const parameters: string[] = [];
        if (statement === '') {
            return {steps: [''], parameters: []};
        }
        while (statement) {
            const match = /\$\[([a-zA-Z0-9_]+)(?:[:](id|val|lit|key))?]/m.exec(statement);
            if (match) {
                const param = match[1];
                const fmt: ParamFormat = (match[2] || 'val') as ParamFormat;
                if (match.index > 0) {
                    steps.push(statement.substring(0, match.index));
                }
                parameters.push(param);
                steps.push({param: param, pick: this.pick(param, fmt)});
                statement = statement.substring(match.index + match[0].length);
            } else {
                steps.push(statement);
                statement = "";
            }
        }
        return {
            name: name,
            steps: steps,
            parameters: R.uniq(parameters),
        };
    }

    protected validate(val: any, fmt: ParamFormat): boolean {
        switch (fmt) {
            case 'id':
                return typeof val === 'string';
            case 'lit':
                return (typeof val === 'string')
                    && !!val.match(/^[a-zA-Z][a-zA-Z0-9_$]*$/);
            case 'key':
                return (typeof val === 'string')
                    && !!val.match(/^[a-zA-Z][a-zA-Z0-9_$]*$/);
            case 'val':
                const isPrimitive = (v: any) => (typeof v === 'string')
                    || (typeof v === 'number')
                    || (typeof v === 'boolean');
                if (isPrimitive(val)) {
                    return true;
                }
                if (Array.isArray(val)) {
                    return R.all(v => this.validate(v, fmt))(val);
                }
                if (typeof val === 'object') {
                    return R.all(v => this.validate(v, 'key'))(R.keys(val))
                        && R.all(v => this.validate(v, fmt))(R.values(val));
                }
                return false;
            default:
                return never(fmt, `Unknown format: "${fmt}"`);
        }
    }

    protected format(val: any, fmt: ParamFormat): string {
        const escape = (v: string) => v.replace(/['"\\]/mg, "\\$&");
        const quoteStr = (v: string) => {
            switch (fmt) {
                case 'id': return `\`${escape(v)}\``;
                case 'key':
                    if (v.match(/^[a-zA-Z][a-zA-Z0-9]+$/)) {
                        return v;
                    } else {
                        return `\"${escape(v)}"`;
                    }
                case 'val': return `"${escape(v)}"`;
                case 'lit': return escape(v);
                default: return never(fmt, `Unknown format: "${fmt}"`);
            }
        };
        const tVal = typeof val;
        switch (tVal) {
            case 'string':
                return quoteStr(val);
            case 'number':
            case 'boolean':
                return val;
            case 'object':
                if (val instanceof Date) {
                    // For prototyping.
                    return quoteStr(`date:${val.valueOf()}`);
                } else if (Array.isArray(val)) {
                    return `[${val.map(v => this.format(v, fmt)).join(',')}]`;
                } else {
                    const fn = (k: string) => `${this.format(k, 'id')}:${ this.format(val[k], fmt)}`;
                    return `{${Object.keys(val).sort().map(fn).join(', ') }}`;
                }
        }
        return never(`Unknown data in query parameter value: ${val}`);
    }

    /**
     * Expand  the query with the supplied parameters. Return the expanded statement, plus information about used and
     * unused parameters.
     * @param {AnyParams} params
     * @returns {QueryExpansion}
     */
    public expand(params: AnyParams): api.QueryExpansion {
        const missing: string[] = [];
        const parameters = {...params};
        const process = (step: ParseStep): string => {
            if (typeof step === "string") {
                return step;
            }
            const val = step.pick(params);
            if (val === undefined) {
                missing.push(step.param);
                return `$[${step.param}]`;
            } else {
                delete parameters[step.param];
                return val;
            }
        };
        const statement = this.parsed.steps.map(process).join('');
        const unused = ownKeys(parameters) as string[];
        return {name: this.parsed.name, statement, parameters, unused, missing};
    }

    /**
     * Make a new `QueryParser` of the same type as this one, with a new statement.
     * @param {string} statement
     * @returns {this}
     */
    public reparse(statement: string): this {
        type t = new (statement: string) => this;
        const t = this.constructor as t;
        return new t(statement);
    }
}
