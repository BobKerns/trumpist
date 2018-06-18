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

type Level = "severe" | "error" | "warn" | "info" | "debug" | "trace";
type LevelOrInherit = Level | "INHERIT";

interface LevelSpecs {
    levels: {
        [K in Level]: number;
    };
    colors: {
        [K in Level]: string;
    };
}

const levelSpecs: LevelSpecs = {
    levels: {
        severe: 0,
        error: 1,
        warn: 2,
        info: 3,
        debug: 4,
        trace: 5,
    },
    colors: {
        severe: "bold red yellowBG",
        error: "bold red",
        warn: "red",
        info: "black",
        debug: "blue",
        trace: "dim blue cyanBG",
    },
};

const LEVELS = levelSpecs.levels;
const maxLevel = Object.keys(LEVELS).reduce((l, k: Level) => Math.max(l, (LEVELS[k])), 0);
const levelNames = Array<Level>(maxLevel + 1);
Object.keys(LEVELS).forEach((k: Level) => levelNames[LEVELS[k]] = k);

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
}

const LOGGERS: {[k: string]: Logger} = {};

/**
 * Create a named loggers
 * @param key the name for the logger
 * @returns the logger fo the specified key.
 */
export function create(key: string, lvl: LevelOrInherit= "INHERIT", parent?: Logger): Logger {
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
class TLogger implements Logger {
    private readonly logger: Logger;
    private _levelNo: number;
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
        return this._level || (this.parent && this.parent.level) || "info";
    }
    public set level(l: Level | "INHERIT") {
        if (l === "INHERIT") {
            this._level = undefined;
            this._levelNo = 10000;
        } else {
            if (LEVELS[l] !== undefined) {
                const levelNo = LEVELS[l];
                this._level = l;
                this._levelNo = levelNo;
            } else {
                throw new Error(`The level ${l} is not valid. It must be one of ${Object.keys(LEVELS)}`);
            }
        }
    }

    protected doLog(levelNo: number, op: (log: Logger) => void) {
        if (levelNo <= this._levelNo) {
            if (!this._level && this.parent) {
                this.parent.doLog(levelNo, op);
            } else {
                queue = queue.then(() => setTimeout(() => {
                        queue = queue.then(() => op(this.logger));
                    },
                    10));
            }
        }
    }

    private fmt(lvl: Level, msg: LogMessage, e?: Error) {
        // tslint:disable-next-line no-console
        return (log: Logger) => console.log(`${this.key} [${lvl}]: ${expand(msg)}`,
            ...((e && [e.stack]) || []));
    }

    public trace(msg: LogMessage, e?: Error): void {
        this.doLog(LEVELS.trace, this.fmt("trace", msg, e));
    }
    public debug(msg: LogMessage, e?: Error): void {
        this.doLog(LEVELS.debug, this.fmt("debug", msg, e));
    }
    public info(msg: LogMessage, e?: Error): void {
        this.doLog(LEVELS.info, this.fmt("info", msg, e));
    }
    public warn(msg: LogMessage, e?: Error): void {
        this.doLog(LEVELS.warn, this.fmt("warn", msg, e));
    }
    public error(msg: LogMessage, e?: Error): void {
        this.doLog(LEVELS.error, this.fmt("error", msg, e));
    }
    public severe(msg: LogMessage, e?: Error): void {
        this.doLog(LEVELS.severe, this.fmt("severe", msg, e));
    }

    public toString() {
        return `[Logger ${this.key}:${this.level}]`;
    }

    public getChild(subkey: string, lvl?: Level): Logger {
        return create(`${this.key}.${subkey}`, (lvl || this.level), this);
    }
}
