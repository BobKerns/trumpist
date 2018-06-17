/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {AnyParams, classChain, Nullable} from "../util/types";
import {SessionCallback} from "../database/api";
import {future, Future} from "../util/future";
import {promises as fs, constants as fsConstants, PathLike} from "fs";
import * as path from 'path';
import {env} from "shelljs";
import * as R from "ramda";

import {create, Logger} from "../util/logging";

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
        log.transports.map(t => t.level = "debug");
        this.log = log;
    }

    protected async loadConfig(): Promise<AnyParams> {
        const load = (f: string) => {
            return (import(f));
        };
        const exists = (f: PathLike) => fs.access(f, fsConstants.R_OK)
            .catch(e => false);
        let m = module;
        while (m.parent) {
            m = m.parent;
        }
        const appdir = path.dirname(m.filename);
        const defaultsFile = path.join(appdir, "trumpist-defaults.config");
        const dff = async () => {
            return load(defaultsFile);
        };
        const defaults: AnyParams = (await exists(defaultsFile)) ? (await dff()) : {};
        let loaded = {};
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
        const classes = classChain(this.constructor).reverse();
        const keys = classes.flatMap(cls => cls.name ? [cls.name] : []);
        const opts = App.mergeContextOptions("appSettings", keys, defaults.app.appSettings, loaded).appSettings;
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
    public async run(): Promise<void> {
        try {
            await this.config;
        } catch (e) {
            (this.log || console).error(`Error running ${this.constructor.name}: ${e.message || e}`);
        }
    }

    protected abstract async doRun(): Promise<void>;

    protected async runInSession(cb: SessionCallback<void>): Promise<void> {

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
