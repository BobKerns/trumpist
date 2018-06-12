/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {future, Future} from "../util/future";
import {AnyParams} from "../util/types";
import defineProperty = Reflect.defineProperty;

type Pick = (params: AnyParams) => string | undefined;
type ParseStep = string | Pick;

interface ParseResult {
    steps: ParseStep[];
    parameters: string[];
}

/**
 * Return result after expansion.
 */
export interface ExpandResult {
    /** The expanded result. */
    statement: string;
    /** Unused supplied parameter values, to be supplied for substitution in running the query. */
    parameters: AnyParams;
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
            let val = params[paramName];
            if (val === undefined) return undefined;

            if (!this.validate(val)) {
                throw new Error(`Invalid value for ${paramName}: ${val}`);
            }
            return val + '';
        };
    }

    private parse(statement: string): ParseResult {
        let steps = [];
        let parameters: string[] = []
        while (statement) {
            let match = /\$\[([a-zA-Z0-9_]+)\]/.exec(statement);
            if (match) {
                let param = match[1];
                if (match.index > 0) {
                    steps.push(statement.substring(0, match.index));
                }
                parameters.push(param);
                steps.push(this.pick(param));
                statement = statement.substring(match.index + match[0].length);
            } else {
                steps.push(statement);
                statement = "";
            }
        }
        return {
            steps: steps,
            parameters: parameters,
        };
    }

    validate(val: any) {
        return true;
    }
}
