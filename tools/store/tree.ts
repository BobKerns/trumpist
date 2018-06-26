/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {Leaf} from "./leaf";
import {ID, JSONable} from "../model/id-factory";

/**
 * A copy-on-write tree to manage our state.
 */

interface Bucket<C> {
    [k: string]: C;
}

export class Tree<L extends JSONable= JSONable> {
    protected root: Bucket<Bucket<Bucket<Leaf<L>>>> = {};

    public find(id: ID): Leaf<L> | undefined {
        const b1 = this.root[id[0]];
        const b2 = b1 && b1[id[1]];
        return (b2 && b2[id]) || undefined;
    }

    constructor(root: Bucket<Bucket<Bucket<Leaf<L>>>> = {}) {
        this.root = root;
    }

    public add(id: ID, val: Leaf<L>): Tree<L> {
        const b1 = this.root[id[0]];
        const b2 = b1 && b1[id[1]];
        const v = b2 && b2[id];
        if (v === val) {
            return this;
        }
        const nb2 = {...b2, [id]: val};
        const nb1 = {...b1, [id[1]]: nb2};
        return new Tree<L>({...this.root, [id[0]]: nb1});
    }
}

