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
MATCH (p:_Node)-[l]-(qx:_Node)
WHERE NOT l.label = "_TAG"
WITH p, l LIMIT 5
MATCH (p)-[l]-(q)
optional match (p)-[lp:_TAG]->(tp)
optional match (q)-[lq:_TAG]->(tq)
RETURN p, l, q, collect(tp.name) as tp, collect(tq.name) as tq;
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
                    tags: rs[0].get('tp'),
                },
            };
            const links: {[k: string]: object} = {};
            rs.forEach(row => {
                const l = row.get('l');
                const q = row.get('q');
                const tq = row.get('tq');
                const qid = q.properties.id;
                nodes[qid] = {
                    id: qid,
                    type: q.properties.type,
                    properties: q.properties,
                    tags: tq,
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
