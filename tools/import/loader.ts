/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {Source} from "./source";
import {AnyParams} from "../util/types";

export class Loader {
    private readonly source: Source;
    private readonly atabaseSpec: AnyParams;
    constructor(source: Source) {
        this.source = source;
    }
}
