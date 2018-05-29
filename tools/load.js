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

const {resultStream} = require('./result-stream');

const Bomstrip = require('bomstrip');

const {convertDateTime} = require('./neo4j-date');

const neo4j = require('neo4j-driver').v1;

const user = 'neo4j';
const password = 'admin';
const uri = 'bolt://localhost:7687';

const ID_ROOT_TYPE='ROOT-TYPE';
const ID_ROOT_TAG='ROOT-TAG';
const ID_ROOT_SPECIAL='ROOT-SPECIAL';
const ID_ROOT_LINK='ROOT-LINK';

// The Neo4J labels we apply to each of our meta types.
const L_TYPE = "Type:_Meta:Node";
const L_TAG = "Tag:_Meta:Node";
const L_SPECIAL = "Special:_Meta:Node";
const L_LINK = "Link:_Meta";

// Statement to link supertypes.
const C_LINK_TYPES = `
MATCH (n:_Meta)
WHERE n.super IS NOT NULL
MATCH (s:_Meta {id: n.super})
MERGE (n)-[:SUPER]->(s)
REMOVE n.super;`;

const ID_NULL_NODE = '00000000-0000-0000-0000-000000000000';

// Statement to create the roots of our metatype hierarchies.
const C_ROOTS = `
MERGE(x:_Meta:Node {name: "--NULL--", label: '--NULL--', id: "${ID_NULL_NODE}"})
MERGE(n:${L_TYPE} {name: "Node", label: "Node", id: "${ID_ROOT_TYPE}"})
MERGE(t:${L_TAG} {name: "Tag", label: "Tag", id: "${ID_ROOT_TAG}"})
MERGE(s:${L_SPECIAL} {name: "Special", label: "Special", id: "${ID_ROOT_SPECIAL}"})
MERGE(l:${L_LINK} {name: "Link", label: "Link", id: "${ID_ROOT_LINK}"});`;

// Statement to add a type. n.super will be used to link in C_LINK_TYPES, then removed.
const C_ADD_TYPE = `
MERGE(n:${L_TYPE} {id: $id})
SET n += $props;`;

// Statement to add a tag. n.super will be used to link in C_LINK_TYPES, then removed.
const C_ADD_TAG = `
MERGE(n:${L_TAG} {id: $id})
SET n += $props;`;

// Statement to add a special. n.super will be used to link in C_LINK_TYPES, then removed.
const C_ADD_SPECIAL = `
MERGE(n:${L_SPECIAL} {id: $id})
SET n += $props;`;

// Statement to add a Link type. n.super will be used to link in C_LINK_TYPES, then removed.
const C_ADD_LINK = `
MERGE(n:${L_LINK} {id: $id})
SET n += $props;`;

// Define our id: uniqueness constraint
const C_ID_CONSTRAINT_NODE = "CREATE CONSTRAINT ON (n:Node) assert n.id IS UNIQUE;";
const C_ID_CONSTRAINT_LINK = "CREATE CONSTRAINT ON (n:Link) assert n.id IS UNIQUE;";
const C_INDEX_NAME = "CREATE INDEX ON :Node(name)";
const C_INDEX_LABEL = "CREATE INDEX ON :Node(label)";

// Load the type labels
const C_LOAD_TYPE_LABELS = `
MATCH path=(p)-[:SUPER *]->(s {id: "ROOT-TYPE"})
RETURN p.id AS id, REDUCE(s=p.name, x IN TAIL(NODES(path)) | s + ':' + x.name) AS labels;`;

//Get a data logging function
function nodeLogger(tname, tag) {
    return logger2(tname, tag, data => `${data.Kind} ${data.Name || 'Unnamed'} / ${data.Label || data.Name || 'Unnamed'}`);
}

//Get a data logging function
function linkLogger(tname, tag) {
    return logger2(tname, tag, data => `${data.Kind}/${data.Meaning} [:${data.link_label || '?'} {Name: "${data.Name || '--'}", Label: "${data.Label || '--'}"}]`);
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

const TYPES = {};
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

function nodeOpts(t, parent) {
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
    if (parent) {
        result.props.super = parent;
    }
    return result;
}

async function loadNodeMetadata(session) {
    let {input, parser, path} = openJSON('thoughts.json');
    console.log(`Scanning ${path} for metadata.`);
    await session.writeTransaction(tx => tx.run(C_ID_CONSTRAINT_NODE));
    await session.writeTransaction(tx => tx.run(C_INDEX_NAME));
    await session.writeTransaction(tx => tx.run(C_INDEX_LABEL));
    await session.writeTransaction(tx => tx.run(C_ROOTS));
    await session.writeTransaction(async tx => {
        async function doKind(tname, tag, k, root, stmt, obj) {
            let logstr = nodeLogger(tname, tag);
            let tail = parser
                .pipe(kind(k))
                .pipe(thru(t => obj[t.Id] = t))
                .pipe(thru(t => tx.run(stmt, nodeOpts(t, t.TypeId || root))
                    .catch(e => tail.emit('error', e))))
                .pipe(logstr);
            tail.on('error', () => input.close());
            return done(tail);
        }

        await Promise.all([
            doKind('Node Type', 'N', 2, ID_ROOT_TYPE, C_ADD_TYPE, TYPES),
            doKind('Tag Type', 'T', 4, ID_ROOT_TAG, C_ADD_TAG, TAGS),
            doKind('Special', 'S', 5, ID_ROOT_SPECIAL, C_ADD_SPECIAL, SPECIALS)
        ]);
        if (!tx.isOpen()) {
            console.error('Transaction is closed.');
        }
        await tx.run(C_LINK_TYPES, {});
    });
    return loadTypeLabels(session);
}

const RE_LABEL = /[^a-zA-Z0-9:]/g;

async function loadTypeLabels(session) {
    let tail = resultStream(session.run(C_LOAD_TYPE_LABELS))
        .pipe(thru(data => TYPES[data.get('id')].labels = data.get('labels').replace(RE_LABEL, '_')))
        .pipe(logger2('Label', 'L', data => `${data.get('id')}: ${data.get('labels').replace(RE_LABEL, '_')}`));
    return done(tail);
}

const FLAG_DIRECTONAL = 1;
const FLAG_REVERSED = 2;
const FLAG_ONE_WAY = 4;
const FLAG_SPECIFIED = 8;

function linkOpts(t, parent) {
    let result = nodeOpts(t, parent);
    let flags = t.Direction < 0 ? 0 : t.Direction;
    let hierarchy = result.props.hierarchy = ((t.Relation === 1) && (t.Meaning === 1));
    let reversed = result.props.dir_reversed = (flags & FLAG_REVERSED) > 0 || t.Meaning in [2, 5];
    result.props.dir_shown = (flags & FLAG_DIRECTONAL) > 0;
    result.props.dir_one_way = (flags & FLAG_ONE_WAY) > 0;
    result.props.dir_specified = (flags & FLAG_SPECIFIED) > 0;
    if (reversed && !hierarchy) {
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
    switch (t.Meaning) {
        case 0:
            return 'PROTO_';
        case 1:
            return null;
        case 2:
            return 'TYPE_';
        case 3:
            //return 'XXX_';
            return null;
        case 5:
            return 'TAG_';
        case 6:
            return 'PIN_';
        default:
            throw new Error(`Unknown Brain link Meaning: ${t.Meaning}`);
    }
}

async function loadLinkMetadata(session) {
    LINKS[ID_ROOT_LINK] = {
        id: ID_ROOT_LINK,
        Name: 'Link',
        link_label: 'Link'
    }
    await session.writeTransaction(tx => tx.run(C_ID_CONSTRAINT_LINK));
    await session.writeTransaction(async tx => {
        let logstr = nodeLogger('Link', 'L', data =>  `${data.Name}`);
        let {input, parser} = openJSON(('links.json'));
        let tail;
        function check(f) {
            return v => {
                try {
                    return f(v);
                } catch (e) {
                    tail.emit('error', e);
                    throw e;
                }
            };
        }
        tail = parser
            .pipe(kind(2, 3))
            .pipe(thru(check(t => t.link_label = linkLabel(t))))
            .pipe(thru(t => LINKS[t.Id] = t))
            .pipe(thru(t => tx.run(C_ADD_LINK, linkOpts(t, t.TypeId || ID_ROOT_LINK))))
            .pipe(logstr);
        tail.on('error', () => input.close());
        await done(tail);
        return tx.run(C_LINK_TYPES, {})
    });
    return session;
}

async function loadMetadata(session) {
    await loadNodeMetadata(session);
    await loadLinkMetadata(session);
    return session;
}

function getNodeStmt(t) {
    let id = t.TypeId;
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
MATCH (f:Node {id: $from_id})
MATCH (t:Node {id: $to_id})
//WHERE NOT (f)-[:SUPER]-(t)
MERGE (f)-[l:\`${label}\` {id: $id}]->(t)
SET l += $props;`;
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
        let typeidLabel = t => (t.TypeId && LINKS[t.TypeId] && LINKS[t.TypeId].link_label);
        let tail = parser
            //.pipe(kind(1))
            .pipe(thru(t => t.link_options = linkOpts(t)))
            .pipe(thru(t => t.link_label = (typeidLabel(t) || linkMeaningLabel(t) || LINKS[ID_ROOT_LINK].link_label)))
            .pipe(thru(t => tx.run(getLinkStmt(t), t.link_options)
                .catch(e => {
                    tail.emit('error', e);
                    throw e;
                })))
            .pipe(logstr);
        tail.on('error', () => input.close());
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