/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {Store, Unsubscribe} from "redux";
import {IView, ModelInterface} from "../store";

export class ModelConnector implements ModelInterface {
    private readonly store: Store;

    public query(viewId: string, filter: (view: IView) => IView, queryId: string, queryParams?: any): Unsubscribe {
        return undefined;
    }

}
