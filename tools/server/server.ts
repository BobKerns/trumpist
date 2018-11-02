/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as Koa from 'koa';
import * as cors from '@koa/cors';
import * as Router from 'koa-router';
import * as mount from 'koa-mount';
import {contentType} from 'mime-types';

import makeApiRouter from './api-router';

import * as send from 'koa-send';
import * as proxy from 'koa-proxies';

import {App} from "../cmd/app";
import * as api from "../database/api";

import {Context} from 'koa';
import * as Serve from 'koa-static';
import * as path from 'path';

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
        app.use(cors({origin: '*'}))
            .use(async (ctx, next) => {
                await next();
                this.log.info(`Request=${ctx.method} ${ctx.request.url} resp=${ctx.response.status} ${ctx.response.message}`);
            });
    }

    private async mountStatic() {
        const staticSpec = (await this.config).paths;
        const app = this.app;
        Object.keys(staticSpec).forEach(k => {
            const p = staticSpec[k];
            const subApp = new Koa();
            subApp.use(async (ctx, next) => {
                const urlPath = ctx.path;
                const ext = path.extname(urlPath);
                const type = contentType(ext);
                if (type) {
                    ctx.append('Content-Type', type);
                }
                await next();
            });
            subApp.use(Serve(p));
            this.log.info(`Mounting /${k} => ${p}`);
            app.use(mount(`/${k}`, subApp));
        });
        const favicon = (await this.config).favicon;
        this.log.info(`Serving favicon.ico from ${favicon}`);
        this.router.get('/favicon.ico', (ctx, next) => send(ctx, favicon, {root: '/'}));
    }

    // Fire up the DB session, and
    public async doRun() {
        this.app.use(async (ctx, then) => {
            ctx.withSession = async (cb: api.SessionCallback<any>): Promise<any> => {
                return await this.runInSession(cb);
            };
            await then();
        });
        await this.mountStatic();
        const reproxy = (context: string, options: object) => {
            const px = proxy(context, options);
            return async (ctx: Context, next: () => any) => {
                this.log.info(`PROXY ${ctx.method} ${ctx.path}`);
                await px(ctx, next);
            };
        };
        this.router
            .get('/', reproxy('/',
                {
                    target: 'http://localhost:3000/',
                    changeOrigin: true,
                    jar: true,
                }))
            .get('/index.html', reproxy('/index.html',
                {
                    target: 'http://localhost:3000/',
                    changeOrigin: true,
                    jar: true,
                }))
            .get('/static/(.*)', reproxy('/static/(.*)',
                {
                    target: 'http://localhost:3000/',
                    changeOrigin: true,
                    jar: true,
                }));
        this.app
            .use(this.router.middleware())
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
