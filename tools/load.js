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

const bomstrip = require('bomstrip');

const {convertDateTime} = require('./neo4j-date');

const neo4j = require('neo4j-driver').v1;

const user = 'neo4j';
const password = 'admin';
const uri = 'bolt://localhost:7687';

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

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

// Statement to create the roots of our metatype hierarchies.
const C_ROOTS = `
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
const C_ID_CONSTRAINT = "CREATE CONSTRAINT ON (n:Node) assert n.id IS UNIQUE;";

// Load the type labels
const C_LOAD_TYPE_LABELS = `
MATCH path=(p)-[*]->(s {id: "ROOT-TYPE"})
RETURN p.id AS id, REDUCE(s=p.name, x IN TAIL(NODES(path)) | s + ':' + x.name) AS labels;`;

//Get a data logging function
function logger(tname, tag) {
    return logger2(tname, tag, data => `${data.Kind} ${data.Name} / ${data.Label || data.Name}`);
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

function kind(k) {
    return filter(t => t.Kind === k);
}

function openJSON(file) {
    let path = resolve(braindir, file);
    let input = fs.createReadStream(path, 'utf8');
    let parser = jsonlines.parse();
    input
        .pipe(new bomstrip())
        .pipe(parser);
    return {input, parser, path};
}

const OMIT_PROPS = ['Name', 'Label', 'TypeId', 'CreationDateTime', 'ModificationDateTime', 'BrainId', 'ThoughtIdA', 'ThoughtIdB', 'Id'];

function nodeOpts(t, parent) {
    let brainKeys = R.difference(R.keys(t), OMIT_PROPS);
    let brainProps = {};
    brainKeys.forEach(k => brainProps['brain_' + k] =t[k]);
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
    await session.writeTransaction(tx => tx.run(C_ID_CONSTRAINT));
    await session.writeTransaction(tx => tx.run(C_ROOTS));
    await session.writeTransaction(async tx => {
        async function doKind(tname, tag, k, root, stmt, obj) {
            let logstr = logger(tname, tag);
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

async function loadTypeLabels(session) {
    let tail = resultStream(session.run(C_LOAD_TYPE_LABELS))
        .pipe(logger2('Label', 'L', data => `${data.get('id')}: ${data.get('labels')}`));
    return done(tail);
}

async function loadLinkMetadata(session) {
    await session.writeTransaction(async tx => {
        let logstr = logger('Link', 'L', data =>  `${data.Name}`);
        let {input, parser} = openJSON(('links.json'));
        let tail = parser
            .pipe(kind(2))
            .pipe(thru(t => tx.run(C_ADD_LINK, nodeOpts(t, t.TypeId || ID_ROOT_LINK))))
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

loadMetadata(driver.session(neo4j.WRITE))
    .then(session => session.close())
    .then(() => console.log('CLOSED'))
    .then(() => driver.close())
    .then(() => console.log('DRIVER CLOSED'))
    .catch(e => console.error(`Error: ${e.code || 'MISC'} ${e.message} ${e.stack}`));

