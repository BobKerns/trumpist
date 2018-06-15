/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {v1 as neo4j, impl} from "../neo4j-driver";
import {AnyParams} from "../../util/types";

/**
 * Test a class. The type info should allow the test call to compile, and the constructor should be present
 * and be a function.
 * @param {string} name
 * @param {{new(...args: any[]): T}} constr The constructor
 * @param T the type of instance the constructor is for.
 */
function testClass<T>(name: string, constr: new (...args: any[]) => T) {
    return it(`Provides ${name} type and constructor`, () => {
        expect(constr).toBeInstanceOf(Function);
    });
}

/**
 * Testing an interface does not do much. If it compiles, and does *not* have a constructor, it passes. If it has a
 * constructor, the wrong test is being called.
 * The main check is at compile time.
 * @param {string} name The name of the type; this is checked in the namespace for a constructor.
 * @param {AnyParams} ns The namespace.
 * @param {T} examples Examples that the compiler should accept as valid.
 */
function testInterface<T>(name: string, ns: AnyParams, ...examples: T[]) {
    return testTypeInternal("interface", name, ns, ...examples);
}

/**
 * Testing a type does not do much. If it compiles, and does *not* have a constructor, it passes.
 * The main check is at compile time.
 * @param {string} description a description of what is being tested.
 * @param {string} name The name of the type; this is checked in the namespace.
 * @param {AnyParams} ns The namespace.
 * @param {T} examples Examples that the compiler should accept as valid.
 */
function testTypeInternal<T>(description: string, name: string, ns: AnyParams, ...examples: T[]) {
    return Promise.all([
        it(`Provides ${name} ${description}`, () => {
            expect(ns[name]).toBeUndefined();
        }),
        examples.length
        && describe(`Examples of type ${name}`, () => {
            return examples.map(ex => {
                it(`Example of ${name} passed in: ${ex}`, () => {
                    expect(ex).toBeDefined();
                });
            });
        }),
    ]);
}

/**
 * Testing a type does not do much. If it compiles, and does *not* have a constructor, it passes.
 * The main check is at compile time.
 * @param {string} name The name of the type; this is checked in the namespace.
 * @param {AnyParams} ns The namespace.
 * @param {T} examples Examples that the compiler should accept as valid.
 */
function testType<T>(name: string, ns: AnyParams, ...examples: T[]) {
    return testTypeInternal('type', name, ns, ...examples);
}

/**
 * Test one of our generic class types. We only need this for classes, so we can properly check the declard type of
 * the constructors.
 * @param {string} name
 * @param {<T1 extends v1.NumberOrInteger>(...args: any[]) => Generic<T1 extends v1.NumberOrInteger>} constr
 */
function testGeneric<T extends Generic<neo4j.NumberOrInteger>>(
    name: string,
    constr: new<T1 extends neo4j.NumberOrInteger> (...args: any[]) => Generic<T1>) {
    return testClass(name, constr);
}

/**
 * A union type of our various generic classes. This won't detect swapped constructors, but at least that a function
 * is declard to be a constructor of one of these classes.
 */
type Generic<T extends neo4j.NumberOrInteger> = neo4j.types.Node<T> | neo4j.types.Relationship<T>
    | neo4j.types.UnboundRelationship<T>
    | neo4j.types.PathSegment<T> | neo4j.types.Path<T>
    | neo4j.types.ResultSummary<T>
    | neo4j.types.Point<T>
    | neo4j.types.Duration<T>
    | neo4j.types.LocalTime<T>
    | neo4j.types.Time<T>
    | neo4j.types.Date<T>;

/**
 * Test that a function is supplied and a function. We don't validate the signatures; the failures we're looking for
 * are missing type or function.
 * @param {string} name
 * @param {(...args: any[]) => any} fn
 */
function testFunction(name: string, fn: (...args: any[]) => any) {
    it(`Defines function ${name}()`, () => {
        expect(fn).toBeDefined();
        expect(fn).toBeInstanceOf(Function);
    });
}

describe('provides the proper imports', () => {
    describe('Provides the types namespace', () => {
        testClass<neo4j.types.Record>('Record', neo4j.types.Record);
        testInterface<neo4j.types.Result>('Result', neo4j.types);
        testInterface<neo4j.types.ResultSummary<neo4j.NumberOrInteger>>('ResultSummary', neo4j.types);
        testGeneric<neo4j.types.Node<neo4j.NumberOrInteger>>('Node', neo4j.types.Node);
        testGeneric<neo4j.types.Relationship<neo4j.NumberOrInteger>>('Relationship', neo4j.types.Relationship);
        testGeneric<neo4j.types.UnboundRelationship<neo4j.NumberOrInteger>>('UnboundRelationship', neo4j.types.UnboundRelationship);
        testGeneric<neo4j.types.PathSegment<neo4j.NumberOrInteger>>('PathSegment', neo4j.types.PathSegment);
        testGeneric<neo4j.types.Path<neo4j.NumberOrInteger>>('Path', neo4j.types.Path);
        testGeneric<neo4j.types.Point<neo4j.NumberOrInteger>>('Point', neo4j.types.Point);
        testGeneric<neo4j.types.Duration<neo4j.NumberOrInteger>>('Duration', neo4j.types.Duration);
        testGeneric<neo4j.types.LocalTime<neo4j.NumberOrInteger>>('LocalTime', neo4j.types.LocalTime);
        testGeneric<neo4j.types.Time<neo4j.NumberOrInteger>>('Time', neo4j.types.Time);
        testGeneric<neo4j.types.Date<neo4j.NumberOrInteger>>('Date', neo4j.types.Date);
        testGeneric<neo4j.types.DateTime<neo4j.NumberOrInteger>>('DateTime', neo4j.types.DateTime);
        testGeneric<neo4j.types.LocalDateTime<neo4j.NumberOrInteger>>('DateTime', neo4j.types.LocalDateTime);
    });

    describe("Provides the simple namespaces", () => {
        it('defines the session flags', () => {
            const read: neo4j.SessionMode = neo4j.session.READ;
            const write: neo4j.SessionMode = neo4j.session.WRITE;
            expect(read).toBe("READ");
            expect(write).toBe("WRITE");
        });
        it('Defines the error namespace', () => {
            expect(neo4j.error).toBeDefined();
            expect(neo4j.error.SERVICE_UNAVAILABLE).toBeDefined();
            expect(neo4j.error.SESSION_EXPIRED).toBeDefined();
            expect(neo4j.error.PROTOCOL_ERROR).toBeDefined();
        });
    });
    describe("Provides the function namespaces", () => {
        describe("Provides the auth namespace", () => {
            const ns = neo4j.auth;
            testFunction('basic', ns.basic);
            testFunction('kerberos', ns.kerberos);
            testFunction('custom', ns.custom);
        });

        describe("Provides the integer namespace", () => {
            const ns = neo4j.integer;
            testFunction('toNumber', ns.toNumber);
            testFunction('toString', ns.toString);
            testFunction('inSafeRange', ns.inSafeRange);
        });

        describe("Provides the spatial namespace", () => {
            const ns = neo4j.spatial;
            testFunction('isPoint', ns.isPoint);
        });

        describe("Provides the temporal namespace", () => {
            const ns = neo4j.temporal;
            testFunction('isDuration', ns.isDuration);
            testFunction('isLocalTime', ns.isLocalTime);
            testFunction('isTime', ns.isTime);
            testFunction('isDate', ns.isDate);
            testFunction('isLocalDateTime', ns.isLocalDateTime);
            testFunction('isDateTime', ns.isDateTime);
        });
    });
    describe('Other top-level types, functions, and classes', () => {

        testFunction('driver', neo4j.driver);
        testFunction('int', neo4j.int);
        testFunction('isInt', neo4j.isInt);

        testClass('Neo4jError', neo4j.Neo4jError);

        // Real interfaces
        testInterface<neo4j.AuthToken>('AuthToken', neo4j);
        testInterface<neo4j.Config>('Config', neo4j);

        // Pure types
        testType<neo4j.EncryptionLevel>('EncryptionLevel', neo4j,
            "ENCRYPTION_ON", "ENCRYPTION_OFF");
        testType<neo4j.TrustStrategy>('TrustStrategy', neo4j,
            "TRUST_ALL_CERTIFICATES",
            "TRUST_ON_FIRST_USE",
            "TRUST_SIGNED_CERTIFICATES",
            "TRUST_CUSTOM_CA_SIGNED_CERTIFICATES",
            "TRUST_SYSTEM_CA_SIGNED_CERTIFICATES");
        testType<neo4j.SessionMode>('SessionMode', neo4j, "READ", "WRITE");
        testType<neo4j.StatementResult>('StatementResult', neo4j);
        testType<neo4j.Observer>('Observer', neo4j);
        testType<neo4j.ResultSummary>('ResultSummary', neo4j);
        testType<neo4j.Plan>('Plan', neo4j);
        testType<neo4j.ProfiledPlan>('ProfiledPlan', neo4j);
        testType<neo4j.StatementStatistic>('StatementStatistic', neo4j);
        testType<neo4j.Notification>('Notification', neo4j);
        testType<neo4j.ServerInfo>('ServerInfo', neo4j);
        testType<neo4j.NotificationPosition>('NotificationPosition', neo4j);

        // Fake interfaces (really classes that exist in impl as wel).
        testInterface<neo4j.Integer>('Integer', neo4j);
        testInterface<neo4j.Session>('Session', neo4j);
        testInterface<neo4j.Transaction>('Transaction', neo4j);

        testInterface<neo4j.Point>('Point', neo4j);
        testFunction('isPoint', neo4j.isPoint);

        testInterface<neo4j.Duration>('Duration', neo4j);
        testInterface<neo4j.LocalTime>('LocalTime', neo4j);
        testInterface<neo4j.Time>('Time', neo4j);
        testInterface<neo4j.Date>('Date', neo4j);
        testInterface<neo4j.LocalDateTime>('LocalDateTime', neo4j);
        testInterface<neo4j.DateTime>('DateTime', neo4j);
    });

    // The impl namespace is an additional namespace from my import wrapper that provides implementations for some
    // classes and objects for which only type information is normally available.
    describe('Check the impl namespace', () => {
        testClass<neo4j.Integer>('Integer', impl.Integer);
        testClass<neo4j.Session>('Session', impl.Session);
        testClass<neo4j.Transaction>('Transaction', impl.Transaction);
    });
});
