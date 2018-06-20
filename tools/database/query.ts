/*
 * Copyright (c) 2018 Bob Kerns.
 */


import {Future} from "../util/future";
import {QueryParser} from "./query-parser";
import * as api from "./api";
import * as spi from "./spi";
import {AnyParams, Nullable} from "../util/types";

let COUNTER = 0;

/**
 * Abstract query (standin/proxy)
 */
export class Query implements api.Query, spi.Query {
    public readonly name: string;
    public readonly parse: QueryParser;
    public readonly parameters: AnyParams;

    public get statement() {
        return this.parse.statement;
    }

    constructor(parse: QueryParser, parameters: AnyParams = {}, name?: Nullable<string>) {
        this.name = name || parse.parsed.name || `Query-${COUNTER++}`;
        this.parse = parse;
        this.parameters = parameters;
    }

    /**
     * Return the statement as a string (if it's not already).
     */
    public expand(params: AnyParams): api.QueryExpansion {
        const merged = {...this.parameters, ...params};
        const expanded = this.parse.expand(merged);
        if (expanded.missing.length) {
            throw new Error(`Query parameters not found: [${expanded.missing}]`);
        }
        return expanded;
    }

    public curry(name: Nullable<string>, params: AnyParams): Query {
        const merged = {...this.parameters, ...params};
        const expanded = this.parse.expand(merged);
        return new Query(this.parse.reparse(expanded.statement), expanded.parameters, name || `${this.name}-${COUNTER++}`);
    }
}
export type QueryParseFn<Q extends QueryParser> = (statement: string) => Q;

export type TemplateHandler<T> = ((strs: TemplateStringsArray, ...params: any[]) => T) & BackTickFactory;

/**
 * Backtick template operator factory
 */
function readQueryFactory<Q extends QueryParser>(fn: QueryParseFn<Q>): TemplateHandler<Query>  {
    function readQuery(strs: TemplateStringsArray, ...params: any[]): Query {
        const merged = strs.reduce((prev, s, i) => prev + s + (params[i] || ''), '');
        const parse = fn(merged);
        return new Query(parse);
    }
    (readQuery as any).withParser = readQueryFactory;
    return readQuery as any as TemplateHandler<Query>;
}

interface BackTickFactory {
    withParser<U extends QueryParser>(fn: QueryParseFn<U>): TemplateHandler<U>;
}

export const backtick = readQueryFactory((statement) => new QueryParser(statement));

export default backtick;
