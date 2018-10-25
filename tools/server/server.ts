/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as Koa from 'koa';
import * as cors from '@koa/cors';
import * as Router from 'koa-router';

import makeApiRouter from './api-router';

import {App} from "../cmd/app";
import * as api from "../database/api";

import {Context} from 'koa';

declare module "koa" {
    interface Context {
        withSession<T>(session: api.SessionCallback<T>): Promise<T>;
    }
}

class ServerApp extends App {
    private readonly app = new Koa();
    private readonly router = new Router();
    constructor(opts: any) {
        super(opts);
        const app = this.app;
        const router = this.router;
        const apiRouter = makeApiRouter();
        router.use('/api', apiRouter.middleware(), apiRouter.allowedMethods());
        app.use(cors({origin: '*'}));
        app
            .use(async (ctx, next) => {
                await next();
                this.log.info(`Request=${ctx.request.url} resp=${ctx.response.status} ${ctx.response.message}`);
            });
    }

    // Fire up the DB session, and
    public async doRun() {
        this.app.use(async (ctx, then) => {
            ctx.withSession = async (cb: api.SessionCallback<any>): Promise<any> => {
                return await this.runInSession(cb);
            };
            await then();
        });

        this.app.use(this.router.middleware())
                .use(this.router.allowedMethods());
        await new Promise((accept, reject) => {
            this.app.listen(3001)
                .on('close', (err: Error) => {
                    if (err) {
                        reject(err);
                    }
                    accept();
                })
                .on('listening', (err: Error) => {
                    if (err) {
                        reject(err);
                    }
                });
        });
    }
}

new ServerApp({}).run();
