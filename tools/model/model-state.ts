/*
 * Copyright (c) 2018 Bob Kerns.
 */


import {Link, LinkType, MetaType, Node, NodeType} from "./model-types";
import {typeFactory} from "../util/type-factory";

export interface ModelState {
    readonly metatypes: Map<string, MetaType>;
    readonly nodeTypes: Map<string, NodeType>;
    readonly linkTyps: Map<string, LinkType>;
    readonly nodes: Map<string, Node>;
    readonly links: Map<string, Link>;
    readonly branches: Map<string, Node>;
    readonly commits: Map<string, Node>;
}
export const ModelState = typeFactory<ModelState>('ModelState');
