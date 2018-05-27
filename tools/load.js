/* eslint-disable no-console */
/*
 * Copyright (c) 2018 Bob Kerns.
 */
"use strict";

const jsonlines = require('jsonlines');
//var fsp = require('fs/promises');
const fs = require('fs');

const {filter, sink, log, thru, done} = require('./streams');
const util = require('util');

const {resultStream} = require('./result-stream');

const neo4j = require('neo4j-driver').v1;

const user = 'neo4j';
const password = 'admin';
const uri = 'bolt://localhost:7687';

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
const session = driver.session(neo4j.WRITE);

const ID_ROOT_TYPE='ROOT-TYPE';
const ID_ROOT_TAG='ROOT-TAG';
const ID_ROOT_SPECIAL='ROOT-SPECIAL';

// The Neo4J labels we apply to each of our meta types.
const L_TYPE = "Type:_Meta:Node";
const L_TAG = "Tag:_Meta:Node";
const L_SPECIAL = "Special:_Meta:Node";

// Statement to link supertypes.
const C_LINK_TYPES = `
MATCH (n:Node)
WHERE n.super IS NOT NULL
MATCH (s:Node {id: n.super})
MERGE (n)-[:SUPER]->(s)
REMOVE n.super;`;

// Statement to create the roots of our metatype hierarchies.
const C_ROOTS = `
MERGE(n:${L_TYPE} {name: "Node", label: "Node", id: "${ID_ROOT_TYPE}"})
MERGE(t:${L_TAG} {name: "Tag", label: "Tag", id: "${ID_ROOT_TAG}"})
MERGE(s:${L_SPECIAL} {name: "Special", label: "Special", id: "${ID_ROOT_SPECIAL}"});`;

// Statement to add a type. n.super will be used to link in C_LINK_TYPES, then removed.
const C_ADD_TYPE = `
MERGE(n:${L_TYPE} {name: $name, label: $label,  id: $id})
SET n.super = $super;`;


// Statement to add a tag. n.super will be used to link in C_LINK_TYPES, then removed.
const C_ADD_TAG = `
MERGE(n:${L_TAG} {name: $name, label: $label, id: $id})
SET n.super = $super;`;

// Statement to add a special. n.super will be used to link in C_LINK_TYPES, then removed.
const C_ADD_SPECIAL = `
MERGE(n:${L_SPECIAL} {name: $name, label: $label, id: $id})
SET n.super = $super;`;

// Define our id: uniqueness constraint
const C_ID_CONSTRAINT = "CREATE CONSTRAINT ON (n:Node) assert n.id IS UNIQUE;";

// Load the type labels
const C_LOAD_TYPE_LABELS = `
MATCH path=(p)-[*]->(s {id: "ROOT-TYPE"})
RETURN p.id AS id, REDUCE(s=p.name, x IN TAIL(NODES(path)) | s + ':' + x.name) AS labels;`;

function logger(tname, tag) {
    return logger2(tname, tag, data => `${data.Kind} ${data.Name} / ${data.Label || data.Name}`);
}

function logger2(tname, tag, f) {
    let counter = 0;
    function count(s) {
        counter++;
        return s;
    }
    let s = sink(log(tag, data => count(f(data))));
    s.on('finish', () => console.log(`${tag} Loaded ${counter} ${tname} items`));
    return s;
}

const TYPES = {};
const TAGS = {};
const SPECIALS = {};

function kind(k) {
    return filter(t => t.Kind === k);
}

async function loadNodeMetadata() {
    let nodes = fs.createReadStream(('../brain/thoughts.json'));
    let parser = jsonlines.parse();
    nodes.pipe(parser);
    await session.writeTransaction(tx => tx.run(C_ID_CONSTRAINT));
    await session.writeTransaction(tx => tx.run(C_ROOTS));
    await session.writeTransaction(async tx => {
        async function doKind(tname, tag, k, root, stmt, obj) {
            let logstr = logger(tname, tag);
            let nodeOpts = t => ({
                name: t.Name,
                label: t.Label || t.Name,
                super: t.TypeId || root,
                id: t.Id});
            let tail = parser
                .pipe(kind(k))
                .pipe(thru(t => obj[t.Id] = t))
                .pipe(thru(t => tx.run(stmt, nodeOpts(t))
                    .catch(e => tail.emit('error', e))))
                .pipe(logstr);
            tail.on('error', () => nodes.close());
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

loadNodeMetadata()
    .catch(e => console.error(`Error: ${e.message} ${util.inspect(e)} ${e.stack}`
    ))
    .then(() => session.close())
    .then(() => console.log('CLOSED'))
    .then(() => driver.close())
    .then(() => console.log('DRIVER CLOSED'))
    .catch(e => console.error(`Error: ${e.message}`));

