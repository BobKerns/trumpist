/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as crypto from "crypto";
import {never} from "../util/types";
import {Hash} from "crypto";


export type JSONable = JSONableObject | Date | object | any[] | number | string | boolean;

export interface JSONableObject {
    toJSON(): JSONable;
}

export function isJSONable(val: any): val is JSONable {
    const type = typeof val;
    switch (type) {
        case 'number': return true;
        case 'string': return true;
        case 'boolean': return true;
        case 'symbol': return false;
        case 'function': return false;
        case 'undefined': return false;
        case 'object': {
            if (isJSONableObject(val)) {
                return true;
            } else if (val.constructor == Object) {
                return true;
            } else {
                // Otherwise, we expect types to implement `toJSON`.
                return false;
            }
        }
        default: return never(type, `Value is an unknown type: ${type} ${val}`);
    }
}

export function isJSONableObject(val: any): val is JSONableObject {
    return typeof val === 'object' && Reflect.has(val, 'toJSON');
}

export type ID = string;

export class IdFactory {
    public genKey(val: JSONable): ID {
        const hash = crypto.createHash("SHA256");
        this.doValue(hash, val);
        return hash.digest().toString('base64');
    }

    protected doValue(hash: Hash, val: any): void {
        const type = typeof val;
        switch (type) {
            case 'string': return this.doString(hash, val);
            case 'object': return this.doObject(hash, val);
            case 'number': return this.doNumber(hash, val);
            case 'boolean': return this.doBoolean(hash, val);
            case 'undefined': return;
            case 'function':
            case 'symbol':  return this.doError(hash, val);
            default: return never(type, `unknown primitive type "${type}"`); // e.g. BigInt
        }
    }

    protected doString(hash: Hash, val: string) {
        hash.write(`S${val.length}=${val}`);
    }

    protected doNumber(hash: Hash, val: number) {
        hash.write('N', '' + val);
    }

    protected doBoolean(hash: Hash, val: boolean) {
        hash.write(val ? 'T' : 'F');
    }

    protected doError(hash: Hash, val: any) {
        throw new Error(`Illegal value in object: ${val}`);
    }

    protected doObject(hash: Hash, val: object) {
        if (val === null) {
            hash.write('X');
        } else if (Array.isArray(val)) {
            hash.write('[');
            val.forEach(v => this.doValue(hash, v));
            hash.write(']');
        } else if (val instanceof Date) {
            hash.write(`D${val.valueOf()}`);
        } else if (isJSONableObject(val)) {
            this.doValue(hash, val.toJSON());
        } else {
            hash.write('{');
            Object.keys(val)
                .sort()
                .forEach(v => this.doValue(hash, v));
            hash.write('}');
        }
    }
}

