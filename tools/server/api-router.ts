/*
 * Copyright (c) 2018 Bob Kerns.
 */


import * as Router from 'koa-router';
import makeApiRouterV1 from "./api-router-v1";
import {Context, Middleware} from "koa";

function wrapResultMiddleware(): Middleware {
    return async (ctx: Context, next: () => Promise<any>) => {
        const op = ctx.originalUrl;
        try {
            await next();
            const payload = ctx.body;
            ctx.body = {op, payload};
        } catch (e) {
            ctx.body = {op, error: e.message, stack: e.stack};
        }
    };
}

export function makeApiRouter(options: any = {}) {
    const api = new Router(options);
    const v1 = makeApiRouterV1(options);
    return api
        .use(wrapResultMiddleware())
        .use('/v1', v1.middleware(), v1.allowedMethods());
}

export default makeApiRouter;
