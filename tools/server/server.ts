/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as Koa from 'koa';
import * as Router from 'koa-router';
import * as cors from '@koa/cors';

const app = new Koa();
const router = new Router();
app.use(cors({origin: '*'}));

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
