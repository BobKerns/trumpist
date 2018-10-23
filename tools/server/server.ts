/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as Koa from 'koa';
const app = new Koa();

app.use(async (ctx, next) => {
    ctx.response.append('Access-Control-Allow-Origin', '*');
    await next();
});

app.use(async ctx => ctx.response.body = {
    title: 'Trumpist',
    start: 'fish',
    nodes: {
        fish: {id: 'fish', title: 'Fish'}
    },
});


app.listen(3001);
