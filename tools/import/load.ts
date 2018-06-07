/*
 * Copyright (c) 2018 Bob Kerns.
 */
"use strict";

/**
 * Module that loads data from a data source (exported JSON files) into the database.
 */

import {Readable, Writable, Transform, Duplex} from "stream";

import {parse as parseJSON} from "../util/jsonlines";

import {create, Logger} from "../util/logging";
const log = create("import");

import {Nullable} from "../util/types";

import * as fs from "fs";
import * as R from "ramda";

import {filter, sink, logstream, thru, done, Bomstrip, pipeline} from '../util/streams';
import {join, dirname, resolve} from 'path';


import {
    MEANING, MEANING_DESCRIPTORS,
    ID_NULL_NODE,
    DIRECTION,
    KIND,
    INode, ILink, IBrainCommon
} from '../brain/src/index';


import {resultStream} from "../database/result-stream";

import {convertDateTime} from '../database/neo4j-date';

import * as neo4j from '../database/neo4j';
import {AnyParams, Extensible, XForm} from "../util/types";
import {ILinkResult, INodeResult} from "./defs";
import isExtensible = Reflect.isExtensible;
import {Source} from "./source";

const user = 'neo4j';
const password = 'admin';
const uri = 'bolt://localhost:7687';

// ID of node representing root of the node _Type hierarchy
const ID_ROOT_TYPE='ROOT-TYPE';
// ID of node representing root of the _Tag hierarchy.
// No hierarchy is currently implemented, but intent is to produce queries for all subtags.
const ID_ROOT_TAG='ROOT-TAG';
// ID of node representing the root of the _Special hierarchy. This is trivial, containing one special, Pinned.
const ID_ROOT_SPECIAL='ROOT-SPECIAL';
// ID of node representing the root of the _Link hierarchy.
const ID_ROOT_LINK='ROOT-LINK';

// The Neo4J labels we apply to each of our meta types.
const L_TYPE = "_Type:_Meta";
// A tag. Linked to nodes via a _TAG link.
const L_TAG = "_Tag:_Meta";
// Special in Brain refers to the special Pinned node that identifies pins.
const L_SPECIAL = "_Special:_Meta";
// A node that identifies a link type.  It is a node so supertype relations can be modelled.
// (Brain does not support this, and Neo4J doesn't quite really, either, but we can fake it.)
const L_LINK = "_Link:_Meta";

// Statement to create the roots of our metatype hierarchies.
const C_ROOTS = `
MERGE (x:_Meta:_Node {name: "--NULL--", label: '--NULL--', id: "${ID_NULL_NODE}"})
MERGE (n:${L_TYPE} {name: "_Node", label: "Node", id: "${ID_ROOT_TYPE}"})
MERGE (t:${L_TAG} {name: "Tag", label: "Tag", id: "${ID_ROOT_TAG}"})
MERGE (s:${L_SPECIAL} {name: "Special", label: "Special", id: "${ID_ROOT_SPECIAL}"})
MERGE (l:${L_LINK} {name: "Link", label: "Link", id: "${ID_ROOT_LINK}"})
RETURN *;`;

// Statement to link the top nodes to the roots of the metadata hierarchies.
const C_LINK_ROOTS = `
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
const C_ADD_TYPE = `
MERGE(n:${L_TYPE} {id: $id})
SET n += $props;`;

// Statement to add a tag.
const C_ADD_TAG = `
MERGE(n:${L_TAG} {id: $id})
SET n += $props;`;

// Statement to add a special.
const C_ADD_SPECIAL = `
MERGE(n:${L_SPECIAL} {id: $id})
SET n += $props;`;

// Statement to add a Link type.
const C_ADD_LINK = `
MERGE(n:${L_LINK} {id: $id})
SET n += $props;`;

// Define our id: uniqueness constraint
const C_ID_CONSTRAINT_NODE = "CREATE CONSTRAINT ON (n:_Node) assert n.id IS UNIQUE;";
const C_ID_CONSTRAINT_META = "CREATE CONSTRAINT ON (n:_Meta) assert n.id IS UNIQUE;";
// We don't constraint uniqueness for general node names, only metadata.
const C_INDEX_NODE_NAME = "CREATE INDEX ON :_Node(name)";
const C_INDEX_NODE_LABEL = "CREATE INDEX ON :_Node(label)";
const C_CONSTRAINT_TYPE_NAME = "CREATE CONSTRAINT ON (t:_Type) ASSERT t.name IS UNIQUE";
const C_INDEX_TYPE_LABEL = "CREATE INDEX ON :_Type(label)";
const C_CONSTRAINT_TAG_NAME = "CREATE CONSTRAINT ON (t:_Tag) ASSERT t.name IS UNIQUE";
const C_INDEX_TAG_LABEL = "CREATE INDEX ON :_Tag(label)";
const C_CONSTRAINT_LINK_NAME = "CREATE CONSTRAINT ON (l:_Link) ASSERT l.name IS UNIQUE";
const C_INDEX_LINK_LABEL = "CREATE INDEX ON :_Link(label)";
const C_CONSTRAINT_SPECIAL_NAME = "CREATE CONSTRAINT ON (s:_Special) ASSERT s.name IS UNIQUE";
const C_INDEX_SPECIAL_LABEL = "CREATE INDEX ON :_Special(label)";

// Load the type labels
const C_LOAD_TYPE_LABELS = `
MATCH path=(p)-[:_SUPER *1..10]->(s {id: "ROOT-TYPE"})
WITH DISTINCT path, p, s
RETURN p.id AS id, REDUCE(s=p.name, x IN TAIL(NODES(path)) | s + ':' + x.name) AS labels;`;

//Get a data logging function
function nodeLogger(tName: string, tag: string) {
    let f = (data: INode): string => {
        if (!data.Id) {
            throw data;
        }
        return `${data.Id} ${data.Kind} ${data.Name || 'Unnamed'} / ${data.Label || data.Name || 'Unnamed'}`;
    };
    return countingLogger(tName, tag, f);
}

interface AnnoatedLink extends ILink {
    link_label: string;
}

/**
 * Get a data logging function
 */
function linkLogger(tName: string, tag: string) {
    let f = (data: AnnoatedLink) => {
        let opts = !data.Name
            ? ''
            : ` {Name: "${data.Name || '--'}"}`;
        return `${data.Id}: ${data.Kind}/${data.Meaning}/${data.Relation}/${data.Direction} (${data.ThoughtIdA})-[:${data.link_label || '?'}${opts ? `{${opts}}` : ""}]->(${data.ThoughtIdB})`;
    };
    return countingLogger(tName, tag, f);
}

/**
 * Get a stream that logs a count when it finishes.
 */
function countingLogger<F>(tName: string, tag: string, f: XForm<F, string>) {
    let counter = 0;
    function count(s: string): string {
        counter++;
        return s;
    }
    let s = sink(logstream(log, tag, (data: F) => count(f(data))));
    s.on('finish', () => log.info(`${tag}: ===> Loaded ${counter} ${tName} types`));
    return s;
}

type ThruBuilder<F,T,S extends Duplex> = (s:XForm<F,T>)=>S;
/**
 * Convert a stream builder to one that destroys the pipe on error.
 * @param tailFn -- a future value of tail, since we use this result in constructing it.
 * @param  checkedFn
 */
function checkStep<F,T,S extends Duplex>(tailFn: () => Writable, checkedFn: ThruBuilder<F,T,S>): ThruBuilder<F,T,S> {
    function check(f: XForm<F,T>): XForm<F,T> {
        return t => {
            try {
                return f(t);
            } catch (e) {
                tailFn().destroy(e);
                throw e;
            }
        };
    }
    return f => checkedFn(check(f));
}

/**
 * Table of node types.
 */
const TYPES: AnyParams = {
    [ID_NULL_NODE]: {
        Id: ID_NULL_NODE,
        link_label: 'Node:_Node'
    }
};
/**
 * Table of tags
 */
const TAGS: AnyParams = {};
/**
 * Table of special nodes
 */
const SPECIALS: AnyParams = {};
/**
 * Table of link types
 */
const LINKS: AnyParams = {};

LINKS[ID_NULL_NODE] = {};


const OMIT_PROPS = ['Name', 'Label', 'CreationDateTime', 'ModificationDateTime', 'ThoughtIdA', 'ThoughtIdB', 'Id'];

type DbVal1 = string | number | boolean | null;
/**
 * Types we can store in the Database.
 */
type DbVal = DbVal1 | DbVal1[];

function nodeOpts(node: INode|ILink) : INodeResult {
    let t = node as Extensible<INode, DbVal>
    let brainKeys = R.difference(R.keys(t), OMIT_PROPS);
    let brainProps: AnyParams = {};
    let fix = (v: DbVal) => (typeof v === 'number' ? neo4j.int(v) : v);
    brainKeys.forEach(k => brainProps['brain_' + k] = fix(t[k]));
    let v = {
        id: t.Id,
        props: {
            name: t.Name,
            label: t.Label || t.Name,
            creationTime: convertDateTime(t.CreationDateTime),
            modifiedTime: convertDateTime(t.ModificationDateTime),
            ...brainProps
        }
    };
    return v as INodeResult;
}

async function loadNodeMetadata(session: neo4j.Session, source: Source) {
    let input = source.open('thoughts.json');
    log.info(`Scanning ${input.path} for node metadata.`);
    await session.writeTransaction(tx => tx.run(C_ID_CONSTRAINT_NODE));
    await session.writeTransaction(tx => tx.run(C_INDEX_NODE_NAME));
    await session.writeTransaction(tx => tx.run(C_INDEX_NODE_LABEL));
    await session.writeTransaction(tx => tx.run(C_CONSTRAINT_TYPE_NAME));
    await session.writeTransaction(tx => tx.run(C_INDEX_TYPE_LABEL));
    await session.writeTransaction(tx => tx.run(C_CONSTRAINT_TAG_NAME));
    await session.writeTransaction(tx => tx.run(C_INDEX_TAG_LABEL));
    await session.writeTransaction(tx => tx.run(C_CONSTRAINT_LINK_NAME));
    await session.writeTransaction(tx => tx.run(C_INDEX_LINK_LABEL));
    await session.writeTransaction(tx => tx.run(C_CONSTRAINT_SPECIAL_NAME));
    await session.writeTransaction(tx => tx.run(C_INDEX_SPECIAL_LABEL));
    await session.writeTransaction(tx => tx.run(C_ROOTS));
    await session.writeTransaction(async tx => {
        let logstr = nodeLogger('Metadata', 'M');
        let tail: Writable, dead: boolean;
        let fail = (e: Error) => {
            if (!dead) {
                dead = true;
                input.destroy(e);
                tail.destroy(e);
            }
        };
        async function doMetadata(data: INode) {
            if (dead) {
                log.info(`Skipping ${data.Id} due to prior error`);
                return false;
            }
            try {
                switch (data.Kind) {
                    case KIND.TYPE:
                        TYPES[data.Id] = data;
                        await tx.run(C_ADD_TYPE, nodeOpts(data));
                        return true;
                    case KIND.TAG:
                        TAGS[data.Id] = data;
                        await tx.run(C_ADD_TAG, nodeOpts(data));
                        return true;
                    case KIND.SPECIAL:
                        SPECIALS[data.Id] = data;
                        await tx.run(C_ADD_SPECIAL, nodeOpts(data));
                        return true;
                    case KIND.NODE:
                        return false;
                    default:
                        throw new Error(`Unknown Kind: ${data.Kind}`);
                }
            } catch (e) {
                fail(e);
                throw e;
            }
        }
        return pipeline(input, filter(doMetadata), logstr);
    });
}

const RE_LABEL = /[^a-zA-Z0-9:]/g;

async function loadTypeLabels(session: neo4j.Session) {
    log.info('Loading composite node type labels from database');
    let failure: Nullable<Error> = null;
    let processData = (data: neo4j.Record) => {
        try {
            let cleanLabel = (v: string) => v.replace(RE_LABEL, '_');
            let labels = data.get('labels').split(':').map(cleanLabel).join(':');
            TYPES[data.get('id')].labels = labels;
            return data;
        } catch (e) {
            log.error("FAIL: ${e.message}");
            throw e;
        }
    };
    let tail: Writable;
    let thru2 = checkStep(() => tail, thru);
    let record_template = (data: neo4j.Record) => `${data.get('id')}: ${TYPES[data.get('id')].labels}`;
    let log2 = countingLogger('Label', 'L', record_template);
    let rs = resultStream(session.run(C_LOAD_TYPE_LABELS));
    tail = rs.pipe(thru2(processData))
        .pipe(log2);
    return await done(tail)
        .then(v => {
            if (failure) {
                throw failure;
            }
            return v;
        })
}

function linkOpts(t: ILink): ILinkResult {
    let nodeReusult: any = nodeOpts(t);
    let result = nodeReusult as ILinkResult;
    let flags = t.Direction < 0 ? 0 : t.Direction;
    let hierarchy = result.props.hierarchy = ((t.Relation === 1) && (t.Meaning === MEANING.NORMAL));
    let reversed = result.props.dir_reversed = (flags & DIRECTION.REVERSED) > 0 || MEANING_DESCRIPTORS[t.Meaning].reverse || false;
    result.props.dir_shown = (flags & DIRECTION.DIRECTIONAL) > 0;
    result.props.dir_one_way = (flags & DIRECTION.ONE_WAY) > 0;
    result.props.dir_specified = (flags & DIRECTION.SPECIFIED) > 0;
    if (reversed && ((t.Meaning !== 1) || !hierarchy)) {
        result.from_id = t.ThoughtIdB;
        result.to_id = t.ThoughtIdA;
    } else {
        result.from_id = t.ThoughtIdA;
        result.to_id = t.ThoughtIdB;
    }
    return result;
}

function linkLabel(t: ILink): String {
    return linkMeaningLabel(t) || linkProtoLabel(t);
}

function linkProtoLabel(t: ILink) {
    let tid = t.TypeId;
    let proto = tid && LINKS[tid];
    if (proto) {
        return proto.Name;
    }
    return 'Link';
}

function linkMeaningLabel(t: ILink) {
    let info = MEANING_DESCRIPTORS[t.Meaning];
    if (!info) {
        throw new Error(`Unknown Brain link Meaning: ${t.Meaning}`);
    }
    return info.label;
}

async function loadLinkMetadata(session: neo4j.Session, source: Source) {
    await loadLinkTypes(session, source);
    await loadSupertypeRelations(session, source);
    return session;
}

async function loadLinkTypes(session: neo4j.Session, source: Source) {
    LINKS[ID_ROOT_LINK] = {
        id: ID_ROOT_LINK,
        Name: 'Link',
        link_label: 'Link'
    };
    let logstr = linkLogger('Link', 'L');
    let input = source.open(('links.json'));
    log.info(`Scanning ${input.path} for link metadata.`);
    await session.writeTransaction(tx => tx.run(C_ID_CONSTRAINT_META));
    await session.writeTransaction(async tx => {
        let dead = false;
        let proc = (t: ILink) => {
            return tx.run(C_ADD_LINK, linkOpts(t));
        };
        return pipeline(
            input,
            filter(t => t.Meaning === MEANING.PROTO),
            thru((t: Extensible<ILink>) => t.link_label = linkLabel(t)),
            thru((t: Extensible<ILink>) => LINKS[t.Id] = t),
            thru(proc),
            logstr
        );
    });
    return session;
}

async function loadSupertypeRelations(session: neo4j.Session, source: Source) {
    let logstr = linkLogger('Link', 'L');
    let input = source.open(('links.json'));
    log.info(`Scanning ${input.path} for supertype metadata.`);
    await session.writeTransaction(tx => tx.run(C_ID_CONSTRAINT_META));
    await session.writeTransaction(async tx => {
        let dead = false;
        let tail: Writable;
        let thru2 = checkStep(() => tail, thru);
        let filter2 = checkStep(() => tail, filter);
        let proc = (t: Extensible<ILink>) => {
            t.link_options = linkOpts(t);
            t.link_label = '_SUPER';
            return tx.run(getLinkStmt(t), t.link_options)
                .catch(e => {
                    tail.emit('error', e);
                    throw e;
                });
        };
        // noinspection JSUnresolvedFunction
        tail = input
            .pipe(filter2(t => t.Meaning === MEANING.SUBTYPE))
            .pipe(thru2((t: ILink) => LINKS[t.Id] = t))
            .pipe(thru2(proc))
            .pipe(logstr)
            .on('error', (e) => {
                if (!dead) {
                    dead = true;
                    input.destroy(e);
                }
            });
        await done(tail);
    });
    return session;
}

async function loadMetadata(session: neo4j.Session, source: Source) {
    await loadNodeMetadata(session, source);
    await loadLinkMetadata(session, source);
    log.info('Linking to root types');
    await session.writeTransaction(tx => tx.run(C_LINK_ROOTS, {}));
    await loadTypeLabels(session);
    return session;
}

function getNodeStmt(t: INode) {
    let id = t.TypeId || ID_NULL_NODE;
    let existing = TYPES[id].statement;
    if (existing) {
        return existing;
    }
    let labels = TYPES[id].labels;
    let stmt = `
MERGE (n:${labels} {id: $id})
SET n += $props;`;
    TYPES[id].statement = stmt;
    return stmt;
}

async function loadNodes(session: neo4j.Session, source: Source) {
    let input = source.open("thoughts.json");
    log.info(`Loading nodes from ${input.path}.`);
    return session.writeTransaction(async tx => {
        let dead = false;
        let logstr = nodeLogger('Nodes', 'N');
        return pipeline(
            input,
            filter((t: INode) => t.Kind === KIND.NODE),
            thru((t: INode) => tx.run(getNodeStmt(t), nodeOpts(t))),
            logstr
        );
    });
}

function getLinkStmt(t: Extensible<ILink>) {
    let id = t.TypeId;
    if (id && !LINKS[id]) {
        throw new Error(`Missing type definition: ${id}`);
    }
    let existing = id &&  LINKS[id].statement;
    if (existing) {
        return existing;
    }
    let parent = (id && (LINKS[id].Name || LINKS[id].Label));
    let label =  parent || linkMeaningLabel(t) || LINKS[ID_ROOT_LINK].link_label;
    if (!label) {
        throw new Error('unknown link label');
    }
    let stmt = `
OPTIONAL MATCH (f1:_Node {id: $from_id})
OPTIONAL MATCH (t1:_Node {id: $to_id})
OPTIONAL MATCH (f2:_Meta {id: $from_id})
OPTIONAL MATCH (t2:_Meta {id: $to_id})
WITH COALESCE(f1, f2) AS f, COALESCE(t1, t2) AS t
WHERE f IS NOT NULL AND t IS NOT NULL
//WHERE NOT (f)-[:_SUPER]-(t)
MERGE (f)-[l:\`${label}\` {id: $id}]->(t)
SET l += $props
RETURN l;`;
    if (id) {
        LINKS[id].statement = stmt;
        t.statement = stmt;
        t.link_label = label;
    }
    return stmt;
}

// Load the actual link data.
async function loadLinks(session: neo4j.Session, source: Source) {
    let input = source.open('links.json');
    log.info(`Loading links from ${input.path}.`);
    await session.writeTransaction(async tx => {
        let dead = false;
        let logstr = linkLogger('Links', '-');
        let typeidLabel = (t: ILink) => (t.TypeId && LINKS[t.TypeId] && LINKS[t.TypeId].Name);
        return pipeline(
            filter(t => t.Meaning !== MEANING.PROTO && t.Meaning !== MEANING.SUBTYPE),
            thru((t: Extensible<ILink>) => t.link_options = linkOpts(t)),
            thru((t: Extensible<ILink>) =>
                t.link_label = (typeidLabel(t) || linkMeaningLabel(t) || LINKS[ID_ROOT_LINK].link_label)),
            thru((t: Extensible<ILink>) => tx.run(getLinkStmt(t), t.link_options)),
            logstr
        );
    });
}

export async function load(source: Source) {
    let driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {maxTransactionRetryTime: 3000});
    let session = driver.session(neo4j.WRITE);
    try {
        await loadMetadata(session, source);
        await loadNodes(session, source);
        await loadLinks(session, source);
    } catch (e) {
        log.error(`Error: ${e.code || 'MISC'} ${e.message} ${e.stack}`);
    } finally {
        await session.close();
        await driver.close();
    }

}
