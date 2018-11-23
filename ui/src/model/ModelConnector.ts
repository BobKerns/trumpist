/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {Store, Unsubscribe} from "redux";
import {actions, IView, ModelInterface, Nullable, ROOT_VIEW, State, ViewOptions} from "../store";
import {filters} from "./filters";
const {graph, cmd} = actions;

export interface ModelConfig {
    viewId: string;
    parentId?: string;
    filter: string;
    query: string;
    queryParams: {
        [k: string]: string|number|boolean|null|Date;
    };
}

export class ModelConnector implements ModelInterface {
    public readonly viewId: string;
    public readonly options: ViewOptions;
    private static readonly EMPTY: string[] = [];
    private readonly store: Store;
    private unsubscribe: Unsubscribe;

    constructor(viewId: string, options: ViewOptions, store: Store) {
        this.viewId = viewId;
        this.options = options;
        this.store = store;
    }

    public onCreate() {
        const state = this.store.getState();
        const store = this.store;
        if (this.options.parentId) {
            const parent = state.graph.get(this.options.parentId);
            if (!parent) {
                throw new Error(`There is no parent view with ID ${this.options.parentId}`);
            }
            const view = state.graph.get(this.viewId);
            const filter = filters[this.options.filter];
            const nview = filter(view, parent, this.options);
            store.dispatch(graph.set({
                id: this.viewId,
                view: nview,
            }));
            this.onActivation();
        }
    }

    public onConnect() {
        this.doUpdate();
        this.onActivation();
    }

    private doUpdate() {
        const store = this.store;
        /*
         * Update the target view from our state.
         */
        const doUpdate = (): any => {
            const state = this.store.getState();
            const parent = state.graph.get(this.options.parentId);
            const filter = filters[this.options.filter];
            const view = state.graph.get(this.viewId);
            const nview = filter(view, parent, this.options);
            const update = {
                id: this.viewId,
                removeNodes: ModelConnector.EMPTY,
                removeLinks: ModelConnector.EMPTY,
                nodes: nview.nodes,
                links: nview.links,
                options: this.options,
            };
            store.dispatch(graph.update(update));
        };
    }

    private onActivation() {
        const state = this.store.getState();
        const parent = state.graph.get(this.options.parentId);
        const filter = filters[this.options.filter];
        const view: IView = state.graph.get(this.viewId) || state.graph.get(ROOT_VIEW);
        this.store.dispatch(graph.query({
            queryId: this.options.query,
            queryParams: {...this.options, id: (view && view.options.startNode) || null},
        }));
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        this.unsubscribe = this.store.subscribe(() => this.doUpdate());
    }

    public onDisconnect() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }

    public onDestroy() {
        this.onDisconnect();
        this.store.dispatch(graph.remove({id: this.viewId}));
    }
}
