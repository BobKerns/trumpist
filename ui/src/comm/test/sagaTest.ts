/*
 * Copyright (c) 2018 Bob Kerns.
 */

import "jest";
import {Effect, take} from "redux-saga/effects";

export type TestStep<T extends TestAction = TestAction, N extends SagaTest = SagaTest> =
    (api: TestApi) => SagaTest;

export interface TestAction {
    type: string;
    payload: any;
}

export interface TestApi {
    readonly action: TestAction;
    readonly done: boolean;
    continue(): void;
    end(): void;
}

type Test = TestStep | TestAction | Error;

type SagaResult = Effect | SagaIterator | Promise<Effect | SagaIterator>;

interface SagaIterator extends IterableIterator<SagaResult> {}

export class SagaTest {
    private  gen: SagaIterator;
    private value: any = undefined;
    private done: boolean = false;
    private test: Test;
    private steps: Test[] = [];
    private continue: boolean = false;
    private end: boolean = false;
    private readonly stack: SagaIterator[] = [];

    constructor(gen: SagaIterator) {
        expect(gen).not.toBeNull();
        expect((gen as any)[Symbol.iterator]).toBeDefined();
        expect((gen as any).next).toBeDefined();
        this.gen = gen;
    }

    public step<T extends TestAction>(test: Test): this {
        this.steps.push(test);
        return this;
    }

    public async run(iter: IterableIterator<Test> = this.steps[Symbol.iterator]()): Promise<this> {
        const api: TestApi = {
            get done() { return this.done; },
            get action() { return this.value as TestAction; },
            continue() { this.continue = true; },
            end() { this.end = true; },
        };
        while (! this.done) {
            if (!this.test) {
                const s = iter.next();
                if (s.done) {
                    this.test = null;
                } else {
                    this.test = s.value;
                }
            }
            let r = this.gen.next();
            this.value = await r.value;
            this.done = r.done;
            if (this.done) {
                if (this.test === null) {
                    return;
                }
                throw new Error("Premature end of saga");
            }
            while (typeof this.value === 'function') {
                this.stack.push(this.gen);
                this.gen = this.value;
                r = this.gen.next();

            }
        }
        return this;
    }
}
