/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {AnyParams, classChain, Constructor, constructorOf, Nullable} from "../util/types";
import * as api from "../database/api";
import {future, Future} from "../util/future";
import {promises as fs, constants as fsConstants, PathLike} from "fs";
import * as path from 'path';
import {env} from "shelljs";
import * as R from "ramda";

import {create, Level, Logger} from "../util/logging";
import DatabaseAccess, {DbOptions} from "../database/database-access";

export abstract class App {
    protected readonly options: AnyParams;
    protected readonly config: Promise<AnyParams>;
    protected readonly database: Promise<string>;
    protected configSource: string;
    public readonly log: Logger;

    protected constructor(options: AnyParams) {
        this.options = Object.freeze({...options});
        this.config = this.loadConfig();
        let log: string | Logger | undefined = options.log;
        if (typeof log === 'string') {
            log = create(log);
        } else if (!log) {
            log = create(this.constructor.name || 'App');
        }
        const level = options.trace ? Level.trace : (options.debug ? Level.debug : Level.info);
        log.level = level;
        this.log = log;
    }

    protected async loadConfig(): Promise<AnyParams> {
        const load = (f: string) => {
            return (import(f));
        };
        const exists = async (f: PathLike) => fs.access(f, fsConstants.R_OK)
            .then(() => true)
            .catch(e => false);
        let m = module;
        while (m.parent) {
            m = m.parent;
        }
        const appdir = path.dirname(path.dirname(m.filename));
        const defaultsFile = path.join(appdir, "trumpist-defaults.config");
        const dff = async () => {
            return load(defaultsFile);
        };
        const dfe = await exists(defaultsFile);
        const defaults: AnyParams = (dfe) ? (await dff()) : {};
        let loaded: AnyParams = {};
        const homeConfig = path.join(env.HOME, ".trumpist");
        if (this.options.config) {
            this.configSource = this.options.config;
        } else if (await exists(".trumpist")) {
            this.configSource = "./.trumpist";
        } else if (await exists(homeConfig)) {
            this.configSource = homeConfig;
        }
        if (this.configSource) {
            loaded = load(this.configSource);
        }
        const classes = classChain(constructorOf(this)).reverse();
        const keys = classes.flatMap(cls => cls.name ? [cls.name] : []);
        const opts = App.mergeContextOptions("appSettings", keys,
            defaults || {},
            loaded || {});
        return {...opts, ...this.options};
    }

    protected async param(key: string, defaultVal?: any): Promise<any> {
        const config = await this.config;
        return this.options[key] || config[key] || defaultVal;
    }

    /**
     * Public entry point
     * @returns {Promise<void>}
     */
    public async run(): Promise<any> {
        try {
            await this.config;
            return this.doRun();
        } catch (e) {
            (this.log || console).error(`Error running ${this.constructor.name}: ${e.message || e}`);
        }
    }

    protected abstract async doRun(): Promise<any>;

    /**
     * To be called from {@link App.doRun} methods that want access to a database.
     * @param {SessionCallback<void>} cb
     * @returns {Promise<void>}
     */
    protected async runInSession<T>(cb: api.SessionCallback<T>): Promise<T> {
        const dbConfigs = await this.param('dbConfigs');
        const dbConfig = dbConfigs[await this.param('database', 'default')];
        const dbAccess = new DatabaseAccess({
            database: dbConfig.database,
            log: this.log,
            parameters: dbConfig,
        });
        return dbAccess.withDatabase(async db => {
            try {
                return (await db.withSession(api.Mode.WRITE, async session =>
                    (await cb(session))));
            } finally {
                this.log.debug("runInSession session ended");
            }
        });
    }

    /**
     * Merge options specific to a hierarchy of contexts (e.g. class hierarchy).
     * @param {string[]} keys
     * @returns {AnyParams}
     */
    public static mergeContextOptions(contextName: string,
                                      keys: Array<Nullable<string>>,
                                      ...params: Array<Nullable<AnyParams>>): AnyParams {
        return params
            .flatMap(c =>
                [
                    R.omit([contextName], c || {}),
                    ...keys.flatMap(k => !k
                        ? []
                        : [((c || {})[contextName] || {})[k] || {}]),
                ])
            .reduce((left: AnyParams, opts: AnyParams) => ({...left, ...opts}), {});
    }
}
