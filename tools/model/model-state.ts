/*
 * Copyright (c) 2018 Bob Kerns.
 */


import {Link, LinkType, MetaType, Node, NodeType} from "./model-types";
import {Map, RecordOf, Record} from "immutable";

export interface ModelStateProps {
    readonly metatypes: Map<string, MetaType>;
    readonly nodeTypes: Map<string, NodeType>;
    readonly linkTypes: Map<string, LinkType>;
    readonly nodes: Map<string, Node>;
    readonly links: Map<string, Link>;
    readonly branches: Map<string, Node>;
    readonly commits: Map<string, Node>;
}

const defaultValues: ModelStateProps = {
    metatypes: Map(),
    nodeTypes: Map(),
    linkTypes: Map(),
    nodes: Map(),
    links: Map(),
    branches: Map(),
    commits: Map(),
};

export const makeModelState = Record(defaultValues);
export type ModelState = RecordOf<ModelStateProps>;

