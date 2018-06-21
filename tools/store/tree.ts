/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {Bucket} from "./bucket";
import {Leaf} from "./leaf";

/**
 * A copy-on-write tree to manage our state.
 */

export class Tree<L> {
    protected root: Bucket<L, Bucket<L, Leaf<L>> = new Bucket();
}

