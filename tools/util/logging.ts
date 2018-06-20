/*
 * Copyright (c) 2018 Bob Kerns.
 */

/**
 * Logging configuration and setup.
 */

/**
 * We accept either a string, or a function that produces a string. If it's a function,
 * we only call it if logging is enabled.
 */

import {warn} from "winston";
import {Nullable} from "./types";

export type LogMessage = string | (() => string);
/**
 * Our logging, configured.
 */

/* tslint:disable-next-line no-var-requires */
const { createLogger, format, transports, addColors } = require('winston');

export enum Level {
    severe = "severe",
    error = "error",
    warn = "warn",
    info = "info",
    debug = "debug",
    trace = "trace",
    never = "never",
}

type Map<K extends (string | number | symbol), T> = {
    [key in K]: T;
};

export namespace Level {
    import Priority = Level.Priority;
    export type Name = "severe" | "error" | "warn" | "info" | "debug" | "trace" | "never";
    export type Priority = 0 | 1 | 2 | 3 | 4 | 5 | 6;
    type PriorityValues = Map<Name, Priority> & { [k: string]: Priority; };
    type PriorityNames = Map<Priority, Name>  & { [k: number]: Level; };
    type PriorityMap = PriorityValues & PriorityNames;

    export const priority: PriorityValues = {
        severe: 0,
        error: 1,
        warn: 2,
        info: 3,
        debug: 4,
        trace: 5,
        never: 6,
    };

    export const name: PriorityNames = [
        Level.severe, Level.error, Level.warn, Level.info, Level.debug, Level.trace, Level.never,
    ];

    export const INHERIT: "INHERIT" = "INHERIT";
    export type INHERIT = "INHERIT";
}

export type LevelOrInherit = Level | Level.INHERIT;

interface LevelSpecs {
    levels: Map<Level, Level.Priority>;
    colors: Map<Level, string>;
}

const levelSpecs: LevelSpecs = {
    levels: Level.priority,
    colors: {
        severe: "bold red yellowBG",
        error: "bold red",
        warn: "red",
        info: "black",
        debug: "blue",
        trace: "dim blue cyanBG",
        never: "dim white white",
    },
};

// Errors out
addColors(levelSpecs.colors);

export interface Transport {
    level: Level;
}

export interface Logger {
    trace(msg: LogMessage, e?: Error): void;
    debug(msg: LogMessage, e?: Error): void;
    info(msg: LogMessage, e?: Error): void;
    warn(msg: LogMessage, e?: Error): void;
    error(msg: LogMessage, e?: Error): void;
    severe(msg: LogMessage, e?: Error): void;
    transports: Transport[];
    transportsByKey: {
        [key: string]: Transport;
    };
    level: LevelOrInherit;
    readonly parent: Nullable<Logger>;
    getChild(subkey: string, lvl?: Level): Logger;
    log(level: Level, msg: LogMessage, e?: Error): void;
}

const LOGGERS: {[k: string]: Logger} = {};

/**
 * Create a named loggers
 * @param key the name for the logger
 * @returns the logger fo the specified key.
 */
export function create(key: string, lvl: LevelOrInherit= Level.INHERIT, parent?: Logger): Logger {
    return LOGGERS[key] || (LOGGERS[key] = createNew(key, lvl, parent as TLogger));
}

interface LoggerInfo {
    label: string;
    message: string;
    [k: string]: any;
}

const myFormat = format.printf((info: LoggerInfo) => {
    return `[${info.label}] ${info.level}: ${info.message}`;
});

/**
 * Create a new logger and configure
 * @param key the name for the logger
 */
function createNew(key: string, level: LevelOrInherit, parent?: TLogger): Logger {
    const consoleTransport = new transports.Console();
    consoleTransport.level = "trace";
    const logger = createLogger({
        levels: levelSpecs.levels,
        format: format.combine(
            format.colorize(),
            format.label({label: key}),
            myFormat,
        ),
        transports: [consoleTransport],
        transportsByKey: {
            console: consoleTransport,
        },
    });

    logger.toString = () => `[[Logger ${key}]]`;
    logger.key = key;
    return new TLogger(key, logger, level, parent);
}

function expand(msg: LogMessage): string {
    if (typeof msg === 'string') {
        return msg;
    }
    return msg();
}



/**
 * Queue shared among all loggers.
 * @type {Promise<void>}
 */
let queue: Promise<any> = Promise.resolve();
/**
 * Strictly serialize all logging.
 */
export class TLogger implements Logger {
    private readonly logger: Logger;
    private _priority: Level.Priority;
    private _level: Level | undefined;
    public readonly parent: Nullable<TLogger>;

    public readonly key: string;

    public get transports(): Transport[] {
        return this.logger.transports;
    }

    public set transports(update: Transport[]) {
        this.logger.transports = update;
    }

    public get transportsByKey() {
        return this.logger.transportsByKey;
    }

    public getTransport(key: string): Transport | undefined {
        return this.logger.transportsByKey[key];
    }

    constructor(key: string, logger: Logger, level: LevelOrInherit, parent?: TLogger) {
        this.key = key;
        this.logger = logger;
        this.parent = parent;
        this.level = level;
    }

    public get level(): Level | "INHERIT" {
        return this._level || (this.parent && this.parent.level) || Level.info;
    }
    public set level(l: Level | "INHERIT") {
        if (l === "INHERIT") {
            this._level = undefined;
            this._priority = Level.priority.never;
        } else {
            if (Level[l] !== undefined) {
                const priority = Level.priority[l];
                this._level = l;
                this._priority = priority;
            } else {
                throw new Error(`The level ${l} is not valid. It must be one of ${Level.name}`);
            }
        }
    }

    protected doLog(levelNo: number, op: (log: Logger) => void): this {
        if (levelNo <= this._priority) {
            if (!this._level && this.parent) {
                this.parent.doLog(levelNo, op);
            } else {
                queue = queue.then(() => setTimeout(() => {
                        queue = queue.then(() => op(this.logger));
                    },
                    10));
            }
        }
        return this;
    }

    private fmt(lvl: Level, msg: LogMessage, e?: Error) {
        // tslint:disable-next-line no-console
        return (log: Logger) => console.log(`${this.key} [${lvl}]: ${expand(msg)}`,
            ...((e && [e.stack]) || []));
    }

    public log(level: Level, msg: LogMessage, e?: Error): this {
        return this.doLog(Level.priority[level], this.fmt(level, msg, e));
    }

    public trace(msg: LogMessage, e?: Error): this {
        return this.doLog(Level.priority.trace, this.fmt(Level.trace, msg, e));
    }
    public debug(msg: LogMessage, e?: Error): this {
        return this.doLog(Level.priority.debug, this.fmt(Level.debug, msg, e));
    }
    public info(msg: LogMessage, e?: Error): this {
        return this.doLog(Level.priority.info, this.fmt(Level.info, msg, e));
    }
    public warn(msg: LogMessage, e?: Error): this {
        return this.doLog(Level.priority.warn, this.fmt(Level.warn, msg, e));
    }
    public error(msg: LogMessage, e?: Error): this {
        return this.doLog(Level.priority.error, this.fmt(Level.error, msg, e));
    }
    public severe(msg: LogMessage, e?: Error): this {
        return this.doLog(Level.priority.severe, this.fmt(Level.severe, msg, e));
    }

    public toString() {
        return `[Logger ${this.key}:${this.level}]`;
    }

    public getChild(subkey: string, lvl?: Level): Logger {
        return create(`${this.key}.${subkey}`, (lvl || this.level), this);
    }
}
