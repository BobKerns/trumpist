/* eslint-disable no-console */
/*
 * Copyright (c) 2018 Bob Kerns.
 */
"use strict";

const jsonlines = require('jsonlines');
//var fsp = require('fs/promises');
const fs = require('fs');

const R = require('ramda');

const {filter, sink, log, thru, done} = require('./streams');
const {join, dirname, resolve} = require('path');

const basedir = dirname(dirname(module.filename));
const braindir = join(basedir, 'brain');

const {MEANING, MEANING_IDS,
    ID_NULL_NODE,
    FLAG_DIRECTONAL, FLAG_REVERSED, FLAG_ONE_WAY, FLAG_SPECIFIED
} = require('./brain');

const {resultStream} = require('./result-stream');

const Bomstrip = require('bomstrip');

const {convertDateTime} = require('./neo4j-date');

const neo4j = require('neo4j-driver').v1;

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

// Statement to link the top nodes to the roots of the metadata hiearchies.
const C_LINK_ROOTS = `
MATCH (nroot:${L_TYPE} {id: "${ID_ROOT_TYPE}"})
MATCH (troot:${L_TAG} {id: "${ID_ROOT_TAG}"})
MATCH (sroot:${L_SPECIAL} {id: "${ID_ROOT_SPECIAL}"})
MATCH (lroot:${L_LINK} {id: "${ID_ROOT_LINK}"})
WITH nroot, troot, sroot, lroot
MATCH (n:${L_TYPE})
WHERE n.brain_TypeId IS NULL AND n.id <> "${ID_ROOT_TYPE}"
MERGE (n)-[nl:_SUPER]->(nroot)
WITH count(nl) AS types, troot, sroot, lroot
MATCH (t:${L_TAG})
WHERE t.brain_TypeId IS NULL AND t.id <> "${ID_ROOT_TAG}"
MERGE (t)-[nt:_SUPER]->(troot)
WITH types, count(nt) AS tags, sroot, lroot
MATCH (s:${L_SPECIAL})
WHERE s.brain_TypeId IS NULL AND s.id <> "${ID_ROOT_SPECIAL}"
MERGE (s)-[ns:_SUPER]->(sroot)
with types, tags, count(ns) AS supers, lroot
MATCH (l:${L_LINK})
WHERE l.brain_TypeId IS NULL AND l.id <> "${ID_ROOT_LINK}"
MERGE (l)-[nl:_SUPER]->(lroot)
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
function nodeLogger(tname, tag) {
    let f = data => {
        if (!data.Id) {
            throw data;
        }
        return `${data.Id} ${data.Kind} ${data.Name || 'Unnamed'} / ${data.Label || data.Name || 'Unnamed'}`;
    }
    return logger2(tname, tag, f);
}

//Get a data logging function
function linkLogger(tname, tag) {
    let f = data => {
        let opts = !data.Name
            ? ''
            : ` {Name: "${data.Name || '--'}"}`;
        return `${data.Id}: ${data.Kind}/${data.Meaning}/${data.Relation}/${data.Direction} (${data.ThoughtIdA})-[:${data.link_label || '?'}${opts}}]->(${data.ThoughtIdB})`;
    }
    return logger2(tname, tag, f);
}

// Get a generic logging & counting stream
// f(data) -> message
function logger2(tname, tag, f) {
    let counter = 0;
    function count(s) {
        counter++;
        return s;
    }
    let s = sink(log(tag, data => count(f(data))));
    s.on('finish', () => console.log(`${tag}: ===> Loaded ${counter} ${tname} types`));
    return s;
}

function checkStep(tail, s) {
    function check(f) {
        return t => {
            try {
                return f(t);
            } catch (e) {
                tail().emit('error', e);
                throw e;
            }
        };
    }
    return f => s(check(f));
}

const TYPES = {
    [ID_NULL_NODE]: {
        Id: ID_NULL_NODE,
        link_label: 'Node:_Node'
    }
};
const TAGS = {};
const SPECIALS = {};
const LINKS = {};

LINKS[ID_NULL_NODE] = {};

function kind(...k) {
    return filter(t => R.contains(t.Kind, k));
}

function openJSON(file) {
    let path = resolve(braindir, file);
    let input = fs.createReadStream(path, 'utf8');
    let parser = jsonlines.parse();
    input
        .pipe(new Bomstrip())
        .pipe(parser);
    return {input, parser, path};
}

const OMIT_PROPS = ['Name', 'Label', 'CreationDateTime', 'ModificationDateTime', 'BrainId', 'ThoughtIdA', 'ThoughtIdB', 'Id'];

function nodeOpts(t) {
    let brainKeys = R.difference(R.keys(t), OMIT_PROPS);
    let brainProps = {};
    let fix = v => (typeof v === 'number' ? neo4j.int(v) : v);
    brainKeys.forEach(k => brainProps['brain_' + k] = fix(t[k]));
    let result = {
        id: t.Id,
        props: {
            name: t.Name,
            label: t.Label || t.Name,
            creationTime: convertDateTime(t.CreationDateTime),
            modifiedTime: convertDateTime(t.ModificationDateTime),
            ...brainProps
        }
    };
    return result;
}

async function loadNodeMetadata(session) {
    let {input, parser, path} = openJSON('thoughts.json');
    console.log(`Scanning ${path} for node metadata.`);
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
        async function doKind(tname, tag, k, stmt, obj) {
            let logstr = nodeLogger(tname, tag);
            let tail;
            let thru2 = checkStep(() => tail, thru);
            tail = parser
                .pipe(kind(k))
                .pipe(thru2(t => obj[t.Id] = t))
                .pipe(thru2(t => tx.run(stmt, nodeOpts(t))
                    .catch(e => tail.emit('error', e))))
                .pipe(logstr)
                .on('error', () => input.close());
            return done(tail);
        }

        await Promise.all([
            doKind('Node Type', 'N', 2, C_ADD_TYPE, TYPES),
            doKind('Tag Type', 'T', 4, C_ADD_TAG, TAGS),
            doKind('Special', 'S', 5, C_ADD_SPECIAL, SPECIALS)
        ]);
        if (!tx.isOpen()) {
            console.error('Transaction is closed.');
        }
    });
}

const RE_LABEL = /[^a-zA-Z0-9:]/g;

async function loadTypeLabels(session) {
    console.log('Loading composite node type labels from database');
    let processData = data => {
        try {
            let labels = data.get('labels').split(':').map(v => v.replace(RE_LABEL, '_')).join(':');
            TYPES[data.get('id')].labels = labels;
            return data;
        } catch (e) {
            console.error("FAIL: ${e.message}");
        }
    };
    let tail;
    let thru2 = checkStep(() => tail, thru);
    tail = resultStream(session.run(C_LOAD_TYPE_LABELS))
        .pipe(thru2(processData))
        .pipe(logger2('Label', 'L', data => `${data.get('id')}: ${TYPES[data.get('id')].labels}`));
    return done(tail);
}

function linkOpts(t) {
    let result = nodeOpts(t);
    let flags = t.Direction < 0 ? 0 : t.Direction;
    let hierarchy = result.props.hierarchy = ((t.Relation === 1) && (t.Meaning === MEANING.NORMAL.code));
    let reversed = result.props.dir_reversed = (flags & FLAG_REVERSED) > 0 || MEANING_IDS[t.Meaning].reverse;
    result.props.dir_shown = (flags & FLAG_DIRECTONAL) > 0;
    result.props.dir_one_way = (flags & FLAG_ONE_WAY) > 0;
    result.props.dir_specified = (flags & FLAG_SPECIFIED) > 0;
    if (reversed && ((t.Meaning !== 1) || !hierarchy)) {
        result.from_id = t.ThoughtIdB;
        result.to_id = t.ThoughtIdA;
    } else {
        result.from_id = t.ThoughtIdA;
        result.to_id = t.ThoughtIdB;
    }
    return result;
}

function linkLabel(t) {
    return linkMeaningLabel(t) || linkProtoLabel(t);
}

function linkProtoLabel(t) {
    let tid = t.TypeId;
    let proto = tid && LINKS[tid];
    if (proto) {
        return proto.Name;
    }
    return 'Link';
}

function linkMeaningLabel(t) {
    let info = MEANING_IDS[t.Meaning];
    if (!info) {
        throw new Error(`Unknown Brain link Meaning: ${t.Meaning}`);
    }
    return info.label;
}

async function loadLinkMetadata(session) {
    await loadLinkTypes(session);
    await loadSupertypeRelations(session);
    return session;
}

async function loadLinkTypes(session) {
    LINKS[ID_ROOT_LINK] = {
        id: ID_ROOT_LINK,
        Name: 'Link',
        link_label: 'Link'
    };
    let logstr = linkLogger('Link', 'L');
    let {input, parser, path} = openJSON(('links.json'));
    console.log(`Scanning ${path} for link metadata.`);
    await session.writeTransaction(tx => tx.run(C_ID_CONSTRAINT_META));
    await session.writeTransaction(async tx => {
        let tail;
        let thru2 = checkStep(() => tail, thru);
        let filter2 = checkStep(() => tail, filter);
        let proc = t => {
            return tx.run(C_ADD_LINK, linkOpts(t));
        };
        tail = parser
            .pipe(filter2(t => t.Meaning === MEANING.PROTO.code))
            .pipe(thru2(t => t.link_label = linkLabel(t)))
            .pipe(thru2(t => LINKS[t.Id] = t))
            .pipe(thru2(proc))
            .pipe(logstr)
            .on('error', () => input.close());
        await done(tail);
    });
    return session;
}

async function loadSupertypeRelations(session) {
    let logstr = linkLogger('Link', 'L');
    let {input, parser, path} = openJSON(('links.json'));
    console.log(`Scanning ${path} for supertype metadata.`);
    await session.writeTransaction(tx => tx.run(C_ID_CONSTRAINT_META));
    await session.writeTransaction(async tx => {
        let tail;
        let thru2 = checkStep(() => tail, thru);
        let filter2 = checkStep(() => tail, filter);
        let proc = t => {
            t.link_options = linkOpts(t);
            t.link_label = '_SUPER';
            return tx.run(getLinkStmt(t), t.link_options)
                .catch(e => {
                    tail.emit('error', e);
                    throw e;
                });
        };
        tail = parser
            .pipe(filter2(t => t.Meaning === MEANING.SUBTYPE.code))
            .pipe(thru2(t => LINKS[t.Id] = t))
            .pipe(thru2(proc))
            .pipe(logstr)
            .on('error', () => input.close());
        await done(tail);
    });
    return session;
}

const util = require('util');

async function loadMetadata(session) {
    await loadNodeMetadata(session);
    await loadLinkMetadata(session);
    console.log('Linking to root types');
    await session.writeTransaction(tx => tx.run(C_LINK_ROOTS, {})
        .then(v => {
            console.log("LINKED: " + util.inspect(v));
        }).catch(e => {
            console.error(`Failed to link roots: ${e.message}`);
            throw e;
        }));
    await loadTypeLabels(session);
    return session;
}

function getNodeStmt(t) {
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

async function loadNodes(session) {
    let {input, parser, path} = openJSON('thoughts.json');
    console.log(`Loading nodes from ${path}.`);
    await session.writeTransaction(async tx => {
        let logstr = nodeLogger('Nodes', 'N');
        let tail = parser
            .pipe(kind(1))
            .pipe(thru(t => tx.run(getNodeStmt(t), nodeOpts(t))
                .catch(e => tail.emit('error', e))))
            .pipe(logstr);
        tail.on('error', () => input.close());
        return done(tail);
    });
}

function getLinkStmt(t) {
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
async function loadLinks(session) {
    let {input, parser, path} = openJSON('links.json');
    console.log(`Loading links from ${path}.`);
    await session.writeTransaction(async tx => {
        let logstr = linkLogger('Links', '-');
        let typeidLabel = t => {
            let label = (t.TypeId && LINKS[t.TypeId] && LINKS[t.TypeId].Name);
            return label;
        };
        let tail;
        let filter2 = checkStep(() => tail, filter);
        let thru2 = checkStep(() => tail, thru);
        tail = parser
            .pipe(filter2(t => t.Meaning !== MEANING.PROTO.code && t.Meaning !== MEANING.SUBTYPE.code))
            .pipe(thru2(t => t.link_options = linkOpts(t)))
            .pipe(thru2(t => t.link_label = (typeidLabel(t) || linkMeaningLabel(t) || LINKS[ID_ROOT_LINK].link_label)))
            .pipe(thru2(t => tx.run(getLinkStmt(t), t.link_options)
                .catch(e => {
                    tail.emit('error', e);
                    throw e;
                })))
            .pipe(logstr)
            .on('error', () => input.close());
        return done(tail);
    });
}

async function load() {
    let driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    let session = driver.session(neo4j.WRITE);
    try {
        await loadMetadata(session);
        await loadNodes(session);
        await loadLinks(session);
    } catch (e) {
        console.error(`Error: ${e.code || 'MISC'} ${e.message} ${e.stack}`);
    } finally {
        session.close();
        driver.close();
    }

}

load();