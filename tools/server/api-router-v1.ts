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

const Q_START = Q`[START]:
MATCH (p:_Node)--(qx:_Node)
WITH p LIMIT 1
MATCH (p)-[l]-(q)
RETURN p, l, q;
`;

/**
 * Handl the start operation
 * @param ctx KOA Context
 * @param next KOA next()
 */
async function doStart(ctx: Context, next: () => Promise<any>) {
    await ctx.withSession(session => {
        return session.withTransaction(Mode.READ, async (tx: api.Transaction) => {
            const r = await tx.query(Q_START);
            const rs = await r.getResults();
            const p = rs[0].get('p');
            const pid = p.properties.id;
            const nodes = {
                [pid]: {
                    id: pid,
                    type: p.properties.type,
                    properties: p.properties,
                },
            };
            const links: {[k: string]: object} = {};
            rs.forEach(row => {
                const l = row.get('l');
                const q = row.get('q');
                const qid = q.properties.id;
                nodes[qid] = {
                    id: qid,
                    type: q.properties.type,
                    properties: q.properties,
                };
                const lid = l.properties.id;
                links[lid] = {
                    id: lid,
                    type: l.type,
                    properties: l.properties,
                    from: pid,
                    to: qid,
                };
            });
            ctx.response.body = {
                title: 'Trumpist',
                start: pid,
                nodes: nodes,
                links: links,
            };
        });
    });
    await next();
}

export function makeApiRouterV1(options: any = {}): Router {
    const router = new Router(options);
    router
        .get('/start', doStart);
    return router;
}

export default makeApiRouterV1;
