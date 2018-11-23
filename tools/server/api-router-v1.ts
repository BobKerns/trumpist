/*
 * Copyright (c) 2018 Bob Kerns.
 */


import * as Router from 'koa-router';
import {Context} from 'koa';
import * as api from "../database/api";
import {Mode} from "../database/api";
import Q from "../database/query";
import Application = require("koa");
import {CollectedResults, ResultSummary} from "../database/spi";

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


const Q_EXPAND = Q`[EXPAND]:
MATCH (p:_Node {id: $id})-[l]-(qx:_Node)
WHERE NOT l.label = "_TAG"
WITH p, l LIMIT 5
MATCH (p)-[l]-(q)
optional match (p)-[lp:_TAG]->(tp)
optional match (q)-[lq:_TAG]->(tq)
RETURN p, l, q, collect(tp.name) as tp, collect(tq.name) as tq;
`;

async function formatNeighborhood(r: CollectedResults, ctx: Context) {
    const rs = await r.getResults();
    if (rs.length > 0) {

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
        const links: { [k: string]: object } = {};
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
            view: {
                nodes: nodes,
                links: links,
                options: {
                    startNode: pid,
                    filter: 'identity',
                    query: 'expand',
                },
            },
        };
    } else {
        const summary = await r.getResultSummary();
        ctx.response.body = {
            error: `Node not found in query.`,
        }
    }
}

/**
 * Handle the start operation
 * @param ctx KOA Context
 * @param next KOA next()
 */
async function doStart(ctx: Context, next: () => Promise<any>) {
    await ctx.withSession(session => {
        return session.withTransaction(Mode.READ, async (tx: api.Transaction) => {
            const r = await tx.query(Q_START);
            await formatNeighborhood(r, ctx);
        });
    });
    await next();
}

/**
 * Handle the expand operation
 * @param ctx KOA Context
 * @param next KOA next()
 */
async function doExpand(ctx: Context, next: () => Promise<any>) {
    await ctx.withSession(session => {
        return session.withTransaction(Mode.READ, async (tx: api.Transaction) => {
            const id = ctx.params.id;
            const r = await tx.query(Q_EXPAND, {id: id});
            await formatNeighborhood(r, ctx);
        });
    });
    await next();
}

export function makeApiRouterV1(options: any = {}): Router {
    const router = new Router(options);
    router
        .get('/start', doStart)
        .get('/node/:id/expand', doExpand);
    return router;
}

export default makeApiRouterV1;
