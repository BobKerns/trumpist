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
import {AnyParams} from "../util/types";
import defineProperty = Reflect.defineProperty;
import ownKeys = Reflect.ownKeys;

import * as R from "ramda";

type Pick = (params: AnyParams) => (string | undefined);
type ParseStep = string | {param: string, pick: Pick};

interface ParseResult {
    steps: ParseStep[];
    parameters: string[];
}

/**
 * Return result after expansion.
 */
interface ExpandResult {
    /** The expanded result. */
    statement: string;
    /** Unused supplied parameter values, to be supplied for substitution in running the query. */
    parameters: AnyParams;
    /** Parameters not supplied, but used in the template */
    missing: string[];
    /** Parameters supplied but not used, for error reporting */
    unused: string[];
}

export class QueryParser {
    readonly statement: string;
    private readonly _parsed: Future<ParseResult> = future(() => this.parse(this.statement));
    public get parsed() { return this._parsed.value };

    constructor(statement: string) {
        this.statement = statement;
    }

    /**
     * A function to obtain the string value to substiute for a given parameter.
     * @returns A formatted string, or undefined.
     */
    pick(paramName: string): Pick {
        return(params: AnyParams) => {
            if (!params.hasOwnProperty(paramName)) return undefined;
            let val: any = params[paramName];
            if (val === undefined) {
                return undefined;
            } else if (!this.validate(val)) {
                throw new Error(`Invalid value for ${paramName}: ${val}`);
            }
            return this.format(val);
        };
    }

    private parse(statement: string): ParseResult {
        let steps: ParseStep[] = [];
        let parameters: string[] = [];
        if (statement === '') {
            return {steps: [''], parameters: []};
        }
        while (statement) {
            let match = /\$\[([a-zA-Z0-9_]+)]/.exec(statement);
            if (match) {
                let param = match[1];
                if (match.index > 0) {
                    steps.push(statement.substring(0, match.index));
                }
                parameters.push(param);
                steps.push({param: param, pick: this.pick(param)});
                statement = statement.substring(match.index + match[0].length);
            } else {
                steps.push(statement);
                statement = "";
            }
        }
        return {
            steps: steps,
            parameters: R.uniq(parameters),
        };
    }

    protected validate(val: any): boolean {
        return true;
    }

    protected format(val: any) : string {
        return '' + val;
    }

    /**
     * Expand  the query with the supplied parameters. Return the expanded statement, plus information about used and
     * unused parameters.
     * @param {AnyParams} params
     * @returns {ExpandResult}
     */
    public expand(params: AnyParams) : ExpandResult {
        const missing: string[] = [];
        const parameters = {...params};
        let process = (step: ParseStep): string => {
            if (typeof step === "string") {
                return step;
            }
            let val = step.pick(params);
            if (val === undefined) {
                missing.push(step.param);
                return `$[${step.param}]`;
            } else {
                delete parameters[step.param];
                return val;
            }
        };
        const statement = this.parsed.steps.map(process).join();
        const unused = ownKeys(parameters) as string[];
        return {statement, parameters, unused, missing};
    }
}
