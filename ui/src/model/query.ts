/*
 * Copyright (c) 2018 Bob Kerns.
 */


export class Query<I extends string, P extends {}> {
    public readonly id: I;
    public readonly params: Array<keyof P>;

    constructor(id: I, ...params: Array<keyof P>) {
        this.id = id;
        this.params = params;
    }
}

export const queries = {
    expand: new Query<'expand', {start: string}>('expand', 'start'),
};

export type QueryName = keyof typeof queries;
