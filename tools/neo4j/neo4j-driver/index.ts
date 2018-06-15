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

/**
 * Change this to change where the requires happen from. Changing the imports requires editing the code.
 */

const NEO4J = "./v1";

import {NumberOrInteger as t_NumberOrInteger} from "./v1/graph-types";

import t_Record, * as m_record from './v1/record';
import t_Transaction, * as m_transaction from './v1/transaction';
import * as m_driver from "./v1/driver";
import * as m_error from "./v1/error";
import * as m_graph from "./v1/graph-types";
import t_Integer, * as m_integer from "./v1/integer";
import t_ResultSummary, {statementType} from "./v1/result-summary";
import t_Result, * as m_result from "./v1/result";
import t_Session, * as m_session from "./v1/session";
import * as m_spatial from "./v1/spatial-types";
import * as m_temporal from "./v1/temporal-types";
import * as m_index from "./v1/index";

export namespace v1 {
    const r_index = require(`${NEO4J}/index`);
    const r_summary = require(`${NEO4J}/result-summary`);
    const r_result = require(`${NEO4J}/result`);
    const r_integer = require(`${NEO4J}/integer`);
    const r_session = require(`${NEO4J}/session`);
    const r_transaction = require(`${NEO4J}/transaction`);
    export type NumberOrInteger = t_NumberOrInteger;
    export namespace types {
        /* tslint:disable no-shadowed-variable */
        export type Node<T extends NumberOrInteger = Integer> = m_index.Node<T>;
        export const Node = r_index.types.Node;

        export type Relationship<T extends NumberOrInteger = Integer> = m_index.Relationship<T>;
        export const Relationship = r_index.types.Relationship;

        export type UnboundRelationship<T extends NumberOrInteger = Integer> = m_index.UnboundRelationship<T>;
        export const UnboundRelationship = r_index.types.UnboundRelationship;

        export type PathSegment<T extends NumberOrInteger = Integer> = m_index.PathSegment<T>;
        export const PathSegment = r_index.types.PathSegment;

        export type Path<T extends NumberOrInteger = Integer> = m_index.Path<T>;
        export const Path = r_index.types.Path;

        /**
         * These ar mis-declared as an inteface. This may be deliberate, so we'll leave just the types here,
         * and repeat this in the the impl namespace with the constructor.
         */
        export type ResultSummary<S extends NumberOrInteger = Integer> = t_ResultSummary<S>;

        export type Result = t_Result;

        /**
         * Oddly, this one includes implementation, here, but not at top level.
         */
        export type Record = t_Record;
        export const Record = t_Record as new (keys: string[], fields: any[], fieldLookup?: { [index: string]: string }) => Record;

        export type Point<T extends NumberOrInteger = Integer> = m_index.Point<T>;
        export const Point = r_index.types.Point;

        export type Duration<T extends NumberOrInteger = Integer> = m_index.Duration<T>;
        export const Duration = r_index.types.Duration;

        export type LocalTime<T extends NumberOrInteger = Integer> = m_index.LocalTime<T>;
        export const LocalTime = r_index.types.LocalTime;

        export type Time<T extends NumberOrInteger = Integer> = m_index.Time<T>;
        export const Time = r_index.types.Time;

        export type Date<T extends NumberOrInteger = Integer> = m_index.Date<T>;
        export const Date = r_index.types.Date;

        export type LocalDateTime<T extends NumberOrInteger = Integer> = m_index.LocalDateTime<T>;
        export const LocalDateTime = r_index.types.LocalDateTime;

        export type DateTime<T extends NumberOrInteger = Integer> = m_index.DateTime<T>;
        export const DateTime = r_index.types.DateTime;

        /* tslint:enable no-shadowed-variable */
    }


    export const driver = m_index.driver;
    export const int = m_integer.int;
    export const isInt = m_index.isInt;

    export type Driver = m_driver.Driver;

    export type Neo4jError = m_index.Neo4jError;
    export const Neo4jError = m_index.Neo4jError;

    // Interface-only class exports:

    export type Node<T extends NumberOrInteger = Integer> = m_index.Node<T>;
    export type Relationship<T extends NumberOrInteger = Integer> = m_index.Relationship<T>;
    export type UnboundRelationship<T extends NumberOrInteger = Integer> = m_index.UnboundRelationship<T>;
    export type PathSegment<T extends NumberOrInteger = Integer> = m_index.PathSegment<T>;

    export type ResultSummary<S extends NumberOrInteger = Integer> = t_ResultSummary<S>;
    export type Result = t_Result;

    // True interfaces
    export type AuthToken = m_index.AuthToken;
    export type Config = m_index.Config;

    // Pure types.
    export type EncryptionLevel = m_index.EncryptionLevel;
    export type TrustStrategy = m_index.TrustStrategy;
    export type SessionMode = m_index.SessionMode;
    export type StatementResult = m_index.StatementResult;
    export type Observer = m_index.Observer;
    export type Plan = m_index.Plan;
    export type ProfiledPlan = m_index.ProfiledPlan;
    export type StatementStatistic = m_index.StatementStatistic;
    export type Notification = m_index.Notification;
    export type ServerInfo = m_index.ServerInfo;
    export type NotificationPosition = m_index.NotificationPosition;

    // Interface-only class exports.
    export type Integer = t_Integer;
    export type Session = t_Session;
    export type Transaction = t_Transaction;

    export type Point = m_index.Point;
    export const isPoint = m_index.isPoint;


    export type Duration<T extends NumberOrInteger = Integer> = m_index.Duration<T>;
    export type LocalTime<T extends NumberOrInteger = Integer> = m_index.LocalTime<T>;
    export type Time<T extends NumberOrInteger = Integer> = m_index.Time<T>;
    export type Date<T extends NumberOrInteger = Integer> = m_index.Date<T>;
    export type LocalDateTime<T extends NumberOrInteger = Integer> = m_index.LocalDateTime<T>;
    export type DateTime<T extends NumberOrInteger = Integer> = m_index.DateTime<T>;

    export const isDuration = m_index.isDuration;
    export const isLocalTime = m_index.isLocalTime;
    export const isTime = m_index.isTime;
    export const isDate = m_index.isDate;
    export const isLocalDateTime = m_index.isLocalDateTime;
    export const isDateTime = m_index.isDateTime;

    // Sub-namespaces we re-export directly.
    export const auth = r_index.auth;
    export const error = r_index.error;
    export const integer = r_index.integer;
    export const spatial = r_index.spatial;
    export const temporal = r_index.temporal;
    export const session = m_index.session;
}


export namespace impl {
    const r_index = require(`${NEO4J}/index`);
    const r_summary = require(`${NEO4J}/result-summary`);
    const r_result = require(`${NEO4J}/result`);
    const r_integer = require(`${NEO4J}/integer`);
    export const r_session = require(`${NEO4J}/session`);
    export const r_transaction = require(`${NEO4J}/transaction`);
    export type NumberOrInteger = t_NumberOrInteger;

    export type Driver = m_driver.Driver;
    export const Driver = require(`${NEO4J}/driver`).Driver;

    export type ResultSummary<S extends t_NumberOrInteger = Integer> = t_ResultSummary<S>;
    export const ResultSummary = r_summary
        .default as new<T extends t_NumberOrInteger> (statement: string, parameters: object, metadata: object) => ResultSummary<T>;

    export type Result = t_Result;
    export const Result = r_result.default as new () => Result;

    export type Integer = t_Integer;
    export const Integer = r_integer.default as new () => Integer;
    export type Session = t_Session;
    export const Session = r_session.default as new () => Session;
    export type Transaction = t_Transaction;
    export const Transaction = r_transaction.default as new () => Transaction;
}

export default v1;
