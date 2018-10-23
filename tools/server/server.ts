/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as Koa from 'koa';
import * as Router from 'koa-router';

const app = new Koa();
const router = new Router();

app.use(async (ctx, next) => {
    ctx.response.append('Access-Control-Allow-Origin', '*');
    await next();
});

router.get('/api/v1/start', (ctx, next) => {
    ctx.response.body = {
        title: 'Trumpist',
        start: 'fish',
        nodes: {
            fish: {id: 'fish', title: 'Fish'},
        },
    };
});

app
    .use(router.routes())
    .use(router.allowedMethods());


app.listen(3001);
