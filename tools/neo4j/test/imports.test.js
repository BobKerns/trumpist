"use strict";
/*
 * Copyright (c) 2018 Bob Kerns.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const neo4j_driver_1 = require("../neo4j-driver");
/**
 * Test a class. The type info should allow the test call to compile, and the constructor should be present
 * and be a function.
 * @param {string} name
 * @param {{new(...args: any[]): T}} constr The constructor
 * @param T the type of instance the constructor is for.
 */
function testClass(name, constr) {
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
function testInterface(name, ns, ...examples) {
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
function testTypeInternal(description, name, ns, ...examples) {
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
function testType(name, ns, ...examples) {
    return testTypeInternal('type', name, ns, ...examples);
}
/**
 * Test one of our generic class types. We only need this for classes, so we can properly check the declard type of
 * the constructors.
 * @param {string} name
 * @param {<T1 extends v1.NumberOrInteger>(...args: any[]) => Generic<T1 extends v1.NumberOrInteger>} constr
 */
function testGeneric(name, constr) {
    return testClass(name, constr);
}
/**
 * Test that a function is supplied and a function. We don't validate the signatures; the failures we're looking for
 * are missing type or function.
 * @param {string} name
 * @param {(...args: any[]) => any} fn
 */
function testFunction(name, fn) {
    it(`Defines function ${name}()`, () => {
        expect(fn).toBeDefined();
        expect(fn).toBeInstanceOf(Function);
    });
}
describe('provides the proper imports', () => {
    describe('Provides the types namespace', () => {
        testClass('Record', neo4j_driver_1.v1.types.Record);
        testInterface('Result', neo4j_driver_1.v1.types);
        testInterface('ResultSummary', neo4j_driver_1.v1.types);
        testGeneric('Node', neo4j_driver_1.v1.types.Node);
        testGeneric('Relationship', neo4j_driver_1.v1.types.Relationship);
        testGeneric('UnboundRelationship', neo4j_driver_1.v1.types.UnboundRelationship);
        testGeneric('PathSegment', neo4j_driver_1.v1.types.PathSegment);
        testGeneric('Path', neo4j_driver_1.v1.types.Path);
        testGeneric('Point', neo4j_driver_1.v1.types.Point);
        testGeneric('Duration', neo4j_driver_1.v1.types.Duration);
        testGeneric('LocalTime', neo4j_driver_1.v1.types.LocalTime);
        testGeneric('Time', neo4j_driver_1.v1.types.Time);
        testGeneric('Date', neo4j_driver_1.v1.types.Date);
        testGeneric('DateTime', neo4j_driver_1.v1.types.DateTime);
        testGeneric('DateTime', neo4j_driver_1.v1.types.LocalDateTime);
    });
    describe("Provides the simple namespaces", () => {
        it('defines the session flags', () => {
            const read = neo4j_driver_1.v1.session.READ;
            const write = neo4j_driver_1.v1.session.WRITE;
            expect(read).toBe("READ");
            expect(write).toBe("WRITE");
        });
        it('Defines the error namespace', () => {
            expect(neo4j_driver_1.v1.error).toBeDefined();
            expect(neo4j_driver_1.v1.error.SERVICE_UNAVAILABLE).toBeDefined();
            expect(neo4j_driver_1.v1.error.SESSION_EXPIRED).toBeDefined();
            expect(neo4j_driver_1.v1.error.PROTOCOL_ERROR).toBeDefined();
        });
    });
    describe("Provides the function namespaces", () => {
        describe("Provides the auth namespace", () => {
            const ns = neo4j_driver_1.v1.auth;
            testFunction('basic', ns.basic);
            testFunction('kerberos', ns.kerberos);
            testFunction('custom', ns.custom);
        });
        describe("Provides the integer namespace", () => {
            const ns = neo4j_driver_1.v1.integer;
            testFunction('toNumber', ns.toNumber);
            testFunction('toString', ns.toString);
            testFunction('inSafeRange', ns.inSafeRange);
        });
        describe("Provides the spatial namespace", () => {
            const ns = neo4j_driver_1.v1.spatial;
            testFunction('isPoint', ns.isPoint);
        });
        describe("Provides the temporal namespace", () => {
            const ns = neo4j_driver_1.v1.temporal;
            testFunction('isDuration', ns.isDuration);
            testFunction('isLocalTime', ns.isLocalTime);
            testFunction('isTime', ns.isTime);
            testFunction('isDate', ns.isDate);
            testFunction('isLocalDateTime', ns.isLocalDateTime);
            testFunction('isDateTime', ns.isDateTime);
        });
    });
    describe('Other top-level types, functions, and classes', () => {
        testFunction('driver', neo4j_driver_1.v1.driver);
        testFunction('int', neo4j_driver_1.v1.int);
        testFunction('isInt', neo4j_driver_1.v1.isInt);
        testClass('Neo4jError', neo4j_driver_1.v1.Neo4jError);
        // Real interfaces
        testInterface('AuthToken', neo4j_driver_1.v1);
        testInterface('Config', neo4j_driver_1.v1);
        // Pure types
        testType('EncryptionLevel', neo4j_driver_1.v1, "ENCRYPTION_ON", "ENCRYPTION_OFF");
        testType('TrustStrategy', neo4j_driver_1.v1, "TRUST_ALL_CERTIFICATES", "TRUST_ON_FIRST_USE", "TRUST_SIGNED_CERTIFICATES", "TRUST_CUSTOM_CA_SIGNED_CERTIFICATES", "TRUST_SYSTEM_CA_SIGNED_CERTIFICATES");
        testType('SessionMode', neo4j_driver_1.v1, "READ", "WRITE");
        testType('StatementResult', neo4j_driver_1.v1);
        testType('Observer', neo4j_driver_1.v1);
        testType('ResultSummary', neo4j_driver_1.v1);
        testType('Plan', neo4j_driver_1.v1);
        testType('ProfiledPlan', neo4j_driver_1.v1);
        testType('StatementStatistic', neo4j_driver_1.v1);
        testType('Notification', neo4j_driver_1.v1);
        testType('ServerInfo', neo4j_driver_1.v1);
        testType('NotificationPosition', neo4j_driver_1.v1);
        // Fake interfaces (really classes that exist in impl as wel).
        testInterface('Integer', neo4j_driver_1.v1);
        testInterface('Session', neo4j_driver_1.v1);
        testInterface('Transaction', neo4j_driver_1.v1);
        testInterface('Point', neo4j_driver_1.v1);
        testFunction('isPoint', neo4j_driver_1.v1.isPoint);
        testInterface('Duration', neo4j_driver_1.v1);
        testInterface('LocalTime', neo4j_driver_1.v1);
        testInterface('Time', neo4j_driver_1.v1);
        testInterface('Date', neo4j_driver_1.v1);
        testInterface('LocalDateTime', neo4j_driver_1.v1);
        testInterface('DateTime', neo4j_driver_1.v1);
    });
    // The impl namespace is an additional namespace from my import wrapper that provides implementations for some
    // classes and objects for which only type information is normally available.
    describe('Check the impl namespace', () => {
        testClass('Integer', neo4j_driver_1.impl.Integer);
        testClass('Session', neo4j_driver_1.impl.Session);
        testClass('Transaction', neo4j_driver_1.impl.Transaction);
    });
});
//# sourceMappingURL=imports.test.js.map