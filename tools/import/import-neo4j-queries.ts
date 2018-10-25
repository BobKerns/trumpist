/*
 * Copyright (c) 2018 Bob Kerns.
 */

import db, {api, query} from "../database";


import Q = query.backtick;
import {ID_NULL_NODE} from "../brain/index";
import {ModelQueries} from "../model/model-queries";
import {ImportQueries} from "./import-queries";

// ID of node representing root of the node _Type hierarchy
const ID_ROOT_TYPE = 'ROOT-TYPE';
// ID of node representing root of the _Tag hierarchy.
// No hierarchy is currently implemented, but intent is to produce queries for all subtags.
const ID_ROOT_TAG = 'ROOT-TAG';
// ID of node representing the root of the _Special hierarchy. This is trivial, containing one special, Pinned.
const ID_ROOT_SPECIAL = 'ROOT-SPECIAL';
// ID of node representing the root of the _Link hierarchy.
const ID_ROOT_LINK = 'ROOT-LINK';

// The Neo4J labels we apply to each of our meta types.
const L_TYPE = "_Type:_Meta";
// A tag. Linked to nodes via a _TAG link.
const L_TAG = "_Tag:_Meta";
// Special in Brain refers to the special Pinned node that identifies pins.
const L_SPECIAL = "_Special:_Meta";
// A node that identifies a link type.  It is a node so supertype relations can be modelled.
// (Brain does not support this, and Neo4J doesn't quite really, either, but we can fake it.)
const L_LINK = "_Link:_Meta";

export class ImportNeo4JQueries implements ImportQueries {
// Statement to create the roots of our metatype hierarchies.
    public readonly ROOTS = Q`
MERGE (x:_Meta:_Node {name: "--NULL--", label: '--NULL--', id: "${ID_NULL_NODE}"})
MERGE (n:${L_TYPE} {name: "_Node", label: "Node", id: "${ID_ROOT_TYPE}"})
MERGE (t:${L_TAG} {name: "Tag", label: "Tag", id: "${ID_ROOT_TAG}"})
MERGE (s:${L_SPECIAL} {name: "Special", label: "Special", id: "${ID_ROOT_SPECIAL}"})
MERGE (l:${L_LINK} {name: "Link", label: "Link", id: "${ID_ROOT_LINK}"})
RETURN *;`;

// Statement to link the top nodes to the roots of the metadata hierarchies.
    public readonly LINK_ROOTS = Q`
MATCH (nRoot:${L_TYPE} {id: "${ID_ROOT_TYPE}"})
MATCH (tRoot:${L_TAG} {id: "${ID_ROOT_TAG}"})
MATCH (sRoot:${L_SPECIAL} {id: "${ID_ROOT_SPECIAL}"})
MATCH (lRoot:${L_LINK} {id: "${ID_ROOT_LINK}"})
WITH nRoot, tRoot, sRoot, lRoot
MATCH (n:${L_TYPE})
WHERE n.brain_TypeId IS NULL AND n.id <> "${ID_ROOT_TYPE}"
MERGE (n)-[nl:_SUPER]->(nRoot)
WITH count(nl) AS types, tRoot, sRoot, lRoot
MATCH (t:${L_TAG})
WHERE t.brain_TypeId IS NULL AND t.id <> "${ID_ROOT_TAG}"
MERGE (t)-[nt:_SUPER]->(tRoot)
WITH types, count(nt) AS tags, sRoot, lRoot
MATCH (s:${L_SPECIAL})
WHERE s.brain_TypeId IS NULL AND s.id <> "${ID_ROOT_SPECIAL}"
MERGE (s)-[ns:_SUPER]->(sRoot)
WITH types, tags, count(ns) AS supers, lRoot
MATCH (l:${L_LINK})
WHERE l.brain_TypeId IS NULL AND l.id <> "${ID_ROOT_LINK}"
MERGE (l)-[nl:_SUPER]->(lRoot)
RETURN types, tags, supers, count(nl) AS links;`;


// Statement to add a type.
    public readonly ADD_TYPE = Q`
MERGE(n:${L_TYPE} {id: $id})
SET n += $props;`;

// Statement to add a tag.
    public readonly ADD_TAG = Q`
MERGE(n:${L_TAG} {id: $id})
SET n += $props;`;

// Statement to add a special.
    public readonly ADD_SPECIAL = Q`
MERGE(n:${L_SPECIAL} {id: $id})
SET n += $props;`;

// Statement to add a Link type.
    public readonly ADD_LINK = Q`
MERGE(n:${L_LINK} {id: $id})
SET n += $props;`;

// Define our id: uniqueness constraint
    public readonly ID_CONSTRAINT_NODE = Q`CREATE CONSTRAINT ON (n:_Node) assert n.id IS UNIQUE;`;
    public readonly ID_CONSTRAINT_META = Q`CREATE CONSTRAINT ON (n:_Meta) assert n.id IS UNIQUE;`;
// We don't constrain uniqueness for general node names, only metadata.
    public readonly INDEX_NODE_NAME = Q`CREATE INDEX ON :_Node(name)`;
    public readonly INDEX_NODE_LABEL = Q`CREATE INDEX ON :_Node(label)`;
    public readonly CONSTRAINT_TYPE_NAME = Q`CREATE CONSTRAINT ON (t:_Type) ASSERT t.name IS UNIQUE`;
    public readonly INDEX_TYPE_LABEL = Q`CREATE INDEX ON :_Type(label)`;
    public readonly CONSTRAINT_TAG_NAME = Q`CREATE CONSTRAINT ON (t:_Tag) ASSERT t.name IS UNIQUE`;
    public readonly INDEX_TAG_LABEL = Q`CREATE INDEX ON :_Tag(label)`;
    public readonly CONSTRAINT_LINK_NAME = Q`CREATE CONSTRAINT ON (l:_Link) ASSERT l.name IS UNIQUE`;
    public readonly INDEX_LINK_LABEL = Q`CREATE INDEX ON :_Link(label)`;
    public readonly CONSTRAINT_SPECIAL_NAME = Q`CREATE CONSTRAINT ON (s:_Special) ASSERT s.name IS UNIQUE`;
    public readonly INDEX_SPECIAL_LABEL = Q`CREATE INDEX ON :_Special(label)`;

// Load the type labels
    public readonly LOAD_TYPE_LABELS = Q`
MATCH path=(p)-[:_SUPER *1..10]->(s {id: "ROOT-TYPE"})
WITH DISTINCT path, p, s
RETURN p.id AS id, REDUCE(s=p.name, x IN TAIL(NODES(path)) | s + ':' + x.name) AS labels;`;

    public readonly LINK_STATEMENT = Q`
    OPTIONAL MATCH (f1:_Node {id: $from_id})
    OPTIONAL MATCH (t1:_Node {id: $to_id})
    OPTIONAL MATCH (f2:_Meta {id: $from_id})
    OPTIONAL MATCH (t2:_Meta {id: $to_id})
    WITH COALESCE(f1, f2) AS f, COALESCE(t1, t2) AS t
    WHERE f IS NOT NULL AND t IS NOT NULL
//WHERE NOT (f)-[:_SUPER]-(t)
    MERGE (f)-[l:$[label:id] {id: $id}]->(t)
SET l += $props
RETURN l;`;

    public readonly NODE_STATEMENT = Q`
MERGE (n:$[labels:labels] {id: $id})
SET n += $props;`;
}

export const queries = ImportNeo4JQueries;
