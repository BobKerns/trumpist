/*
 * Copyright (c) 2018 Bob Kerns.
 */


import * as Router from 'koa-router';
import makeApiRouterV1 from "./api-router-v1";

export function makeApiRouter(options: any = {}) {
    const api = new Router(options);
    const v1 = makeApiRouterV1(options);
    return api
        .use('/v1', v1.middleware(), v1.allowedMethods());
}

export default makeApiRouter;
