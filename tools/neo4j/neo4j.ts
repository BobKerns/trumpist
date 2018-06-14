/*
 * Copyright (c) 2018 Bob Kerns.
 */

/**
 * Kludge to work around the Neo4J driver not co-locating their type and lib files.
 */

/**
 * Nothing...
 * @type {null}
 */
const header = null;

import Integer from "./neo4j/integer";
import {NumberOrInteger} from "./neo4j/graph-types";

export * from './neo4j/record';
export {default as Record} from './neo4j/record';
export * from './neo4j/transaction';
export {default as Transaction} from './neo4j/transaction';
export * from "./neo4j/driver";
export * from './neo4j/error';
export * from './neo4j/graph-types';
export * from './neo4j/integer';
export {default as Integer} from './neo4j/integer';
export * from './neo4j/result-summary';
import ResultSummary from './neo4j/result-summary';
/**
 * Re-export the ResultSummary type.
 */
export type ResultSummary<S extends NumberOrInteger> = ResultSummary<S>;
export * from './neo4j/result';
import Result from './neo4j/result';
/**
 * Re-export the Result type.
 */
export type Result = Result;
export * from './neo4j/session';
/**
 * Re-export the Session type.
 */
export {default as Session} from './neo4j/session';
export * from './neo4j/spatial-types';
export * from './neo4j/temporal-types';


