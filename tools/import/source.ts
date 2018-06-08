/*
 * Copyright (c) 2018 Bob Kerns.
 */

/**
 * Input data sources
 */

import {Readable, Duplex, pipeline} from "stream";
import {Bomstrip} from "../util/streams";
import * as path from "path";
import * as fs from "fs";
import {parse as parseJSON} from "../util/jsonlines";

/**
 * A generic input source, producing an `objectNode` `Readable`.
 */

export interface Source {
    open(name: string): Connection;
}

export interface Connection extends Readable {
    path: string;
}


export class FilesystemSource implements Source {
    public readonly directory: string;
    constructor(directory: string) {
        this.directory = directory;
    }
    public open(file: string): Connection {

        const pathname = path.resolve(this.directory, file);
        const input: Readable = fs.createReadStream(pathname, 'utf8');
        const chain = pipeline(input, new Bomstrip(), parseJSON()) as any as Connection;
        chain.path = pathname;
        return chain;
    }
}
