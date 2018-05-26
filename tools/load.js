/*
 * Copyright (c) 2018 Bob Kerns.
 */
"use strict";

var jsonlines = require('jsonlines');
//var fsp = require('fs/promises');
var fs = require('fs');
var {pipeline, filter, sink, log, thru, split, done} = require('./streams');
var util = require('util');

const neo4j = require('neo4j-driver').v1;

const user = 'neo4j';
const password = 'admin';
const uri = 'bolt://localhost:7687';

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
const session = driver.session(neo4j.WRITE);

const C_ADD_TYPE = `
MERGE(n:Type:_Meta:Node {name: $name, label: $label, super: $super, id: $id})
`;


const ID_ROOT_TYPE='ROOT-TYPE';
const ID_ROOT_TAG='ROOT-TAG';
const ID_ROOT_SPECIAL='ROOT-SPECIAL';

const C_LINK_TYPES = `
MATCH (n:Node)
WHERE n.super IS NOT NULL
MATCH (s:Node {id: n.super})
CREATE (n)-[:SUPER]->(s)
REMOVE n.super;`;

const C_ROOTS = `
MERGE(n:Type:_Meta:Node {name: "Node", label: "Node", id: "${ID_ROOT_TYPE}"})
MERGE(t:Tag:_Meta:Node {name: "Tag", label: "Tag", id: "${ID_ROOT_TAG}"})
MERGE(s:Special:_Meta:Node {name: "Special", label: "Special", id: "${ID_ROOT_SPECIAL}"});`

const C_ADD_TAG = `MERGE(n:Tag:_Meta:Node {name: $name, label: $label, super: $super, id: $id});`;
const C_ADD_SPECIAL = "MERGE(n:Special:_Meta:Node {name: $name, label: $label, super: $super, id: $id});";

const C_ID_CONSTRAINT = "CREATE CONSTRAINT ON (n:Node) assert n.id IS UNIQUE;";

function logger(tag) {
    var l = sink(log(tag, data => `${data.Kind} ${data.Name} / ${data.Label || data.Name}`));
    l.count = 0;
    return l;
}



var TYPES = {};
var TAGS = {};
var SPECIALS = {};

function logit(msg) {
    return s => {
        console.log(msg);
        return s;
    };
}

function kind(k) {
    return filter(t => t.Kind === k);
}

async function loadNodeMetadata() {
    let nodes = fs.createReadStream(('../brain/thoughts.json'));
    let parser = jsonlines.parse();
    nodes.pipe(parser);
    await session.writeTransaction(tx => tx.run(C_ID_CONSTRAINT));
    await session.writeTransaction(tx => tx.run(C_ROOTS));
    return session.writeTransaction(async tx => {
        async function doKind(tname, tag, k, root, stmt, obj) {
            let logstr = logger(tag);
            let nodeOpts = t => ({
                name: t.Name,
                label: t.Label || t.Name,
                super: t.TypeId || root,
                id: t.Id});
            let tail = parser
                .pipe(kind(k))
                .pipe(thru(t => obj[t.Id] = t))
                .pipe(thru(t => tx.run(stmt, nodeOpts(t))))
                .pipe(logstr);
            return done(tail);
        };

        await Promise.all([
            doKind('Node Type', 'N', 2, ID_ROOT_TYPE, C_ADD_TYPE, TYPES),
            doKind('Tag Type', 'T', 4, ID_ROOT_TAG, C_ADD_TAG, TAGS),
            doKind('Special', 'S', 5, ID_ROOT_SPECIAL, C_ADD_SPECIAL, SPECIALS)
        ]);
        return tx.run(C_LINK_TYPES, {})
    });
}

loadNodeMetadata()
    .catch(e => console.error(`Error: ${e.message} ${util.inspect(e)} ${e.stack}`
    ))
    .then(() => session.close())
    .then(() => console.log('CLOSED'))
    .then(() => driver.close())
    .then(() => console.log('DRIVER CLOSED'))
    .catch(e => console.error(`Error: ${e.message}`));

