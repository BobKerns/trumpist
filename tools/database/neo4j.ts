/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as top from '../node_modules/neo4j-driver';

export const driver: typeof top.v1.driver = top.v1.driver;
export const int: typeof top.v1.int = top.v1.int;
export const isInt: typeof top.v1.isInt = top.v1.isInt;
export const integer: typeof top.v1.integer = top.v1.integer;
export const auth: typeof top.v1.auth = top.v1.auth;
export const types: typeof top.v1.types = top.v1.types;
export const session: typeof top.v1.session = top.v1.session;
export const error: typeof top.v1.error = top.v1.error;
export const spatial: typeof top.v1.spatial = top.v1.spatial;
export const temporal: typeof top.v1.temporal = top.v1.temporal;
export declare type Driver = top.v1.Driver;
export declare type AuthToken = top.v1.AuthToken;
export declare type Config = top.v1.Config
export declare type EncryptionLevel = top.v1.EncryptionLevel;
export declare type TrustStrategy = top.v1.TrustStrategy;
export declare type SessionMode = top.v1.SessionMode;
export declare type Neo4jError = top.v1.Neo4jError;
export declare type Node = top.v1.Node;
export declare type Relationship = top.v1.Relationship;
export declare type UnboundRelationship = top.v1.UnboundRelationship;
export declare type PathSegment = top.v1.PathSegment;
export declare type Path = top.v1.Path;
export declare type Integer = top.v1.Integer;
export declare type Record = top.v1.Record;
export declare type Result = top.v1.Result;
export declare type StatementResult = top.v1.StatementResult;
export declare type Observer = top.v1.Observer;
export declare type ResultSummary = top.v1.ResultSummary;
export declare type Plan = top.v1.Plan;
export declare type ProfiledPlan = top.v1.ProfiledPlan;
export declare type StatementStatistic = top.v1.StatementStatistic;
export declare type Notification = top.v1.Notification;
export declare type ServerInfo = top.v1.ServerInfo;
export declare type NotificationPosition = top.v1.NotificationPosition;
export declare type Session = top.v1.Session;
export declare type Transaction = top.v1.Transaction;
export declare type Point = top.v1.Point;
export const isPoint: typeof top.v1.isPoint = top.v1.isPoint;
export declare type Duration = top.v1.Duration;
export declare type LocalTime = top.v1.LocalTime;
export declare type Time = top.v1.Time;
export declare type Date = top.v1.Date;
export declare type LocalDateTime = top.v1.LocalDateTime;
export declare type DateTime = top.v1.DateTime;
export const isDuration: typeof top.v1.isDuration = top.v1.isDuration;
export const isLocalTime: typeof top.v1.isLocalTime = top.v1.isLocalTime;
export const isTime: typeof top.v1.isTime = top.v1.isTime;
export const isDate: typeof top.v1.isDate = top.v1.isDate;
export const isLocalDateTime: typeof top.v1.isLocalDateTime = top.v1.isLocalDateTime;
export const isDateTime: typeof top.v1.isDateTime = top.v1.isDateTime;

// Missing
export const READ: SessionMode = "READ";
export const WRITE: SessionMode = "WRITE";


