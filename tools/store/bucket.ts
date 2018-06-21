/*
 * Copyright (c) 2018 Bob Kerns.
 */

/**
 * Buckets for the tree datastructure.
 */

import {Leaf} from "./leaf";

interface TreeNode<T extends TreeNode<any>, C extends Extract<T> {

}

export class Bucket<L> implements TreeNode<L> {
    private children: C[] = [];
}
