/*
 * Copyright (c) 2018 Bob Kerns.
 */


import * as Router from 'koa-router';
import {Context} from 'koa';
import * as api from "../database/api";
import {Mode} from "../database/api";
import Q from "../database/query";

declare module "koa" {
    interface Context {
        withSession<T>(session: api.SessionCallback<T>): Promise<T>;
    }
}

async function doStart(ctx: Context, next: () => Promise<any>) {
    await ctx.withSession(session => {
        return session.withTransaction(Mode.READ, async (tx: api.Transaction) => {
            const r = await tx.query(Q`MATCH (p) RETURN p LIMIT 1;`);
            const rs = await r.getResults();
            const p = rs[0].get('p');
            ctx.response.body = {
                title: 'Trumpist',
                start: p.properties.id,
                nodes: {
                    [p.properties.id]: p,
                },
            };
        });
    });
    await next();
}

export function makeApiRouterV1(options: any = {}): Router {
    const router = new Router(options);
    router
        .get('/start', doStart)
        .get('/foo', async (ctx, next) => {
            await ctx.withSession(session => {
                return session.withTransaction(Mode.READ, async (tx: api.Transaction) => {
                    const r = await tx.query(Q`MATCH (p) RETURN p LIMIT 1;`);
                    const rs = await r.getResults();
                    const n = rs[0].get('p');
                    ctx.response.body = n;
                });
            });
            await next();
        });
    return router;
}

export default makeApiRouterV1;
