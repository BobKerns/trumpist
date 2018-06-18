/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {App} from "./app";
import {AnyParams} from "../util/types";
import {Model} from "../model/model";

export class InitApp extends App {
    constructor(props: AnyParams) {
        super(props);
    }

    protected async doRun() {
        return this.runInSession(async session => {
            const model = new Model(session);
            await model.init();
            this.log.error("InitApp Session ended");
        });
    }

}
