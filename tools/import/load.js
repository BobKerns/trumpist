System.register(["../util/jsonlines", "../util/logging", "fs", "ramda", "../util/streams", "path", "../brain/src/index", "../database/result-stream", "../database/neo4j-date", "../database/neo4j"], function (exports_1, context_1) {
    /*
     * Copyright (c) 2018 Bob Kerns.
     */
    "use strict";
    var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    var jsonlines_1, logging_1, log, fs, R, streams_1, path_1, basedir, braindir, index_1, result_stream_1, neo4j_date_1, neo4j, user, password, uri, ID_ROOT_TYPE, ID_ROOT_TAG, ID_ROOT_SPECIAL, ID_ROOT_LINK, L_TYPE, L_TAG, L_SPECIAL, L_LINK, C_ROOTS, C_LINK_ROOTS, C_ADD_TYPE, C_ADD_TAG, C_ADD_SPECIAL, C_ADD_LINK, C_ID_CONSTRAINT_NODE, C_ID_CONSTRAINT_META, C_INDEX_NODE_NAME, C_INDEX_NODE_LABEL, C_CONSTRAINT_TYPE_NAME, C_INDEX_TYPE_LABEL, C_CONSTRAINT_TAG_NAME, C_INDEX_TAG_LABEL, C_CONSTRAINT_LINK_NAME, C_INDEX_LINK_LABEL, C_CONSTRAINT_SPECIAL_NAME, C_INDEX_SPECIAL_LABEL, C_LOAD_TYPE_LABELS, TYPES, TAGS, SPECIALS, LINKS, OMIT_PROPS, RE_LABEL, util;
    var __moduleName = context_1 && context_1.id;
    //Get a data logging function
    function nodeLogger(tName, tag) {
        let f = data => {
            /**
             * @name data
             * @type Link
             */
            if (!data.Id) {
                throw data;
            }
            return `${data.Id} ${data.Kind} ${data.Name || 'Unnamed'} / ${data.Label || data.Name || 'Unnamed'}`;
        };
        return countingLogger(tName, tag, f);
    }
    //Get a data logging function
    function linkLogger(tName, tag) {
        let f = data => {
            let opts = !data.Name
                ? ''
                : ` {Name: "${data.Name || '--'}"}`;
            return `${data.Id}: ${data.Kind}/${data.Meaning}/${data.Relation}/${data.Direction} (${data.ThoughtIdA})-[:${data.link_label || '?'}${opts ? `{${opts}}` : ""}]->(${data.ThoughtIdB})`;
        };
        return countingLogger(tName, tag, f);
    }
    // Get a generic logging & counting stream
    // f(data) -> message
    /**
     * Get a stream that logs a count wen it finishes.
     */
    function countingLogger(tName, tag, f) {
        let counter = 0;
        function count(s) {
            counter++;
            return s;
        }
        /** @type module:streams.Writable */
        let s = streams_1.sink(streams_1.logstream(log, tag, data => count(f(data))));
        s.on('finish', () => log.info(`${tag}: ===> Loaded ${counter} ${tName} types`));
        return s;
    }
    /**
     *
     * @param {function(): module:streams.Writable} tailFn -- a future value of tail, since we use this result in constructing it.
     * @param {function(*): *} checkedFn
     * @returns {function(*): *}
     */
    function checkStep(tailFn, checkedFn) {
        function check(f) {
            return t => {
                try {
                    return f(t);
                }
                catch (e) {
                    tailFn().destroy(e);
                    throw e;
                }
            };
        }
        return f => checkedFn(check(f));
    }
    /**
     * Open a JSON-per-line file for reading.
     * @param file
     * @returns {{input: module:streams.Readable, parser: module:streams.Duplex, path: *}}
     */
    function openJSON(file) {
        let path = path_1.resolve(braindir, file);
        /** @type {*} */
        let f = fs.createReadStream(path, 'utf8');
        ignore(f);
        /** @type {module:streams.Readable} */
        let input = f;
        /** @type module:streams.Duplex */
        let parser = jsonlines_1.parse();
        input
            .pipe(new streams_1.Bomstrip())
            .pipe(parser);
        return { input, parser, path };
    }
    function ignore() {
    }
    function nodeOpts(t) {
        let brainKeys = R.difference(R.keys(t), OMIT_PROPS);
        let brainProps = {};
        let fix = v => (typeof v === 'number' ? neo4j.int(v) : v);
        brainKeys.forEach(k => brainProps['brain_' + k] = fix(t[k]));
        return {
            id: t.Id,
            props: Object.assign({ name: t.Name, label: t.Label || t.Name, creationTime: neo4j_date_1.convertDateTime(t.CreationDateTime), modifiedTime: neo4j_date_1.convertDateTime(t.ModificationDateTime) }, brainProps)
        };
    }
    function loadNodeMetadata(session) {
        return __awaiter(this, void 0, void 0, function* () {
            let { input, parser, path } = openJSON('thoughts.json');
            log.info(`Scanning ${path} for node metadata.`);
            yield session.writeTransaction(tx => tx.run(C_ID_CONSTRAINT_NODE));
            yield session.writeTransaction(tx => tx.run(C_INDEX_NODE_NAME));
            yield session.writeTransaction(tx => tx.run(C_INDEX_NODE_LABEL));
            yield session.writeTransaction(tx => tx.run(C_CONSTRAINT_TYPE_NAME));
            yield session.writeTransaction(tx => tx.run(C_INDEX_TYPE_LABEL));
            yield session.writeTransaction(tx => tx.run(C_CONSTRAINT_TAG_NAME));
            yield session.writeTransaction(tx => tx.run(C_INDEX_TAG_LABEL));
            yield session.writeTransaction(tx => tx.run(C_CONSTRAINT_LINK_NAME));
            yield session.writeTransaction(tx => tx.run(C_INDEX_LINK_LABEL));
            yield session.writeTransaction(tx => tx.run(C_CONSTRAINT_SPECIAL_NAME));
            yield session.writeTransaction(tx => tx.run(C_INDEX_SPECIAL_LABEL));
            yield session.writeTransaction(tx => tx.run(C_ROOTS));
            yield session.writeTransaction((tx) => __awaiter(this, void 0, void 0, function* () {
                let logstr = nodeLogger('Metadata', 'M');
                let tail, dead;
                let fail = e => {
                    dead = true;
                    input.destroy(e);
                    tail.destroy(e);
                };
                function doMetadata(data) {
                    return __awaiter(this, void 0, void 0, function* () {
                        if (dead) {
                            log.info(`Skipping ${data.Id} due to prior error`);
                            return false;
                        }
                        try {
                            switch (data.Kind) {
                                case index_1.KIND.TYPE:
                                    TYPES[data.Id] = data;
                                    yield tx.run(C_ADD_TYPE, nodeOpts(data));
                                    return true;
                                case index_1.KIND.TAG:
                                    TAGS[data.Id] = data;
                                    yield tx.run(C_ADD_TAG, nodeOpts(data));
                                    return true;
                                case index_1.KIND.SPECIAL:
                                    SPECIALS[data.Id] = data;
                                    yield tx.run(C_ADD_SPECIAL, nodeOpts(data));
                                    return true;
                                case index_1.KIND.NODE:
                                    return false;
                                default:
                                    // noinspection ExceptionCaughtLocallyJS
                                    throw new Error(`Unknown Kind: ${data.Kind}`);
                            }
                        }
                        catch (e) {
                            fail(e);
                            throw e;
                        }
                    });
                }
                let filter2 = checkStep(() => tail, streams_1.filter);
                // noinspection JSUnresolvedFunction
                tail = parser
                    .pipe(filter2(doMetadata))
                    .pipe(logstr)
                    .on('error', (e) => fail(e));
                return yield streams_1.done(tail);
            }));
        });
    }
    function loadTypeLabels(session) {
        return __awaiter(this, void 0, void 0, function* () {
            log.info('Loading composite node type labels from database');
            let failure = null;
            let processData = data => {
                try {
                    // noinspection UnnecessaryLocalVariableJS
                    let labels = data.get('labels').split(':').map(v => v.replace(RE_LABEL, '_')).join(':');
                    TYPES[data.get('id')].labels = labels;
                    return data;
                }
                catch (e) {
                    log.error("FAIL: ${e.message}");
                    throw e;
                }
            };
            let tail;
            let thru2 = checkStep(() => tail, streams_1.thru);
            /**
             *
             * @type {module:streams.Writable}
             */
            let log2 = countingLogger('Label', 'L', data => `${data.get('id')}: ${TYPES[data.get('id')].labels}`);
            /** @type {module:streams.Readable} */
            let rs = result_stream_1.resultStream(session.run(C_LOAD_TYPE_LABELS));
            tail = rs.pipe(thru2(processData))
                .pipe(log2);
            return yield streams_1.done(tail)
                .then(v => {
                if (failure) {
                    throw failure;
                }
                return v;
            });
        });
    }
    function linkOpts(t) {
        let result = nodeOpts(t);
        let flags = t.Direction < 0 ? 0 : t.Direction;
        let hierarchy = result.props.hierarchy = ((t.Relation === 1) && (t.Meaning === index_1.MEANING.NORMAL.code));
        let reversed = result.props.dir_reversed = (flags & FLAG_REVERSED) > 0 || MEANING_IDS[t.Meaning].reverse;
        result.props.dir_shown = (flags & FLAG_DIRECTIONAL) > 0;
        result.props.dir_one_way = (flags & FLAG_ONE_WAY) > 0;
        result.props.dir_specified = (flags & FLAG_SPECIFIED) > 0;
        if (reversed && ((t.Meaning !== 1) || !hierarchy)) {
            result.from_id = t.ThoughtIdB;
            result.to_id = t.ThoughtIdA;
        }
        else {
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
    function loadLinkMetadata(session) {
        return __awaiter(this, void 0, void 0, function* () {
            yield loadLinkTypes(session);
            yield loadSupertypeRelations(session);
            return session;
        });
    }
    function loadLinkTypes(session) {
        return __awaiter(this, void 0, void 0, function* () {
            LINKS[ID_ROOT_LINK] = {
                id: ID_ROOT_LINK,
                Name: 'Link',
                link_label: 'Link'
            };
            let logstr = linkLogger('Link', 'L');
            let { input, parser, path } = openJSON(('links.json'));
            log.info(`Scanning ${path} for link metadata.`);
            yield session.writeTransaction(tx => tx.run(C_ID_CONSTRAINT_META));
            yield session.writeTransaction((tx) => __awaiter(this, void 0, void 0, function* () {
                let tail;
                let thru2 = checkStep(() => tail, streams_1.thru);
                let filter2 = checkStep(() => tail, streams_1.filter);
                let proc = t => {
                    return tx.run(C_ADD_LINK, linkOpts(t));
                };
                // noinspection JSUnresolvedFunction
                tail = parser
                    .pipe(filter2(t => t.Meaning === index_1.MEANING.PROTO.code))
                    .pipe(thru2(t => t.link_label = linkLabel(t)))
                    .pipe(thru2(t => LINKS[t.Id] = t))
                    .pipe(thru2(proc))
                    .pipe(logstr)
                    .on('error', () => input.close());
                yield streams_1.done(tail);
            }));
            return session;
        });
    }
    function loadSupertypeRelations(session) {
        return __awaiter(this, void 0, void 0, function* () {
            let logstr = linkLogger('Link', 'L');
            let { input, parser, path } = openJSON(('links.json'));
            log.info(`Scanning ${path} for supertype metadata.`);
            yield session.writeTransaction(tx => tx.run(C_ID_CONSTRAINT_META));
            yield session.writeTransaction((tx) => __awaiter(this, void 0, void 0, function* () {
                let tail;
                let thru2 = checkStep(() => tail, streams_1.thru);
                let filter2 = checkStep(() => tail, streams_1.filter);
                let proc = t => {
                    t.link_options = linkOpts(t);
                    t.link_label = '_SUPER';
                    return tx.run(getLinkStmt(t), t.link_options)
                        .catch(e => {
                        tail.emit('error', e);
                        throw e;
                    });
                };
                // noinspection JSUnresolvedFunction
                tail = parser
                    .pipe(filter2(t => t.Meaning === index_1.MEANING.SUBTYPE.code))
                    .pipe(thru2(t => LINKS[t.Id] = t))
                    .pipe(thru2(proc))
                    .pipe(logstr)
                    .on('error', () => input.close());
                yield streams_1.done(tail);
            }));
            return session;
        });
    }
    function loadMetadata(session) {
        return __awaiter(this, void 0, void 0, function* () {
            yield loadNodeMetadata(session);
            yield loadLinkMetadata(session);
            log.info('Linking to root types');
            yield session.writeTransaction(tx => tx.run(C_LINK_ROOTS, {})
                .then(v => {
                log.info("LINKED: " + util.inspect(v));
            }).catch(e => {
                log.error(`Failed to link roots: ${e.message}`);
                throw e;
            }));
            yield loadTypeLabels(session);
            return session;
        });
    }
    function getNodeStmt(t) {
        let id = t.TypeId || index_1.ID_NULL_NODE;
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
    function loadNodes(session) {
        return __awaiter(this, void 0, void 0, function* () {
            let { input, parser, path } = openJSON('thoughts.json');
            log.info(`Loading nodes from ${path}.`);
            yield session.writeTransaction((tx) => __awaiter(this, void 0, void 0, function* () {
                let logstr = nodeLogger('Nodes', 'N');
                // noinspection JSUnresolvedFunction
                let tail = parser
                    .pipe(streams_1.filter(t => t.Kind === index_1.KIND.NODE))
                    .pipe(streams_1.thru(t => tx.run(getNodeStmt(t), nodeOpts(t))
                    .catch(e => tail.emit('error', e))))
                    .pipe(logstr);
                tail.on('error', () => input.close());
                return yield streams_1.done(tail);
            }));
        });
    }
    function getLinkStmt(t) {
        let id = t.TypeId;
        if (id && !LINKS[id]) {
            throw new Error(`Missing type definition: ${id}`);
        }
        let existing = id && LINKS[id].statement;
        if (existing) {
            return existing;
        }
        let parent = (id && (LINKS[id].Name || LINKS[id].Label));
        let label = parent || linkMeaningLabel(t) || LINKS[ID_ROOT_LINK].link_label;
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
    function loadLinks(session) {
        return __awaiter(this, void 0, void 0, function* () {
            let { input, parser, path } = openJSON('links.json');
            log.info(`Loading links from ${path}.`);
            yield session.writeTransaction((tx) => __awaiter(this, void 0, void 0, function* () {
                let logstr = linkLogger('Links', '-');
                let typeidLabel = t => (t.TypeId && LINKS[t.TypeId] && LINKS[t.TypeId].Name);
                let tail;
                let filter2 = checkStep(() => tail, streams_1.filter);
                let thru2 = checkStep(() => tail, streams_1.thru);
                // noinspection JSUnresolvedFunction
                tail = parser
                    .pipe(filter2(t => t.Meaning !== index_1.MEANING.PROTO.code && t.Meaning !== index_1.MEANING.SUBTYPE.code))
                    .pipe(thru2(t => t.link_options = linkOpts(t)))
                    .pipe(thru2(t => t.link_label = (typeidLabel(t) || linkMeaningLabel(t) || LINKS[ID_ROOT_LINK].link_label)))
                    .pipe(thru2(t => tx.run(getLinkStmt(t), t.link_options)
                    .catch(e => {
                    tail.emit('error', e);
                    throw e;
                })))
                    .pipe(logstr)
                    .on('error', () => input.close());
                return yield streams_1.done(tail);
            }));
        });
    }
    function load() {
        return __awaiter(this, void 0, void 0, function* () {
            let driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
            let session = driver.session(neo4j.WRITE);
            try {
                yield loadMetadata(session);
                yield loadNodes(session);
                yield loadLinks(session);
            }
            catch (e) {
                log.error(`Error: ${e.code || 'MISC'} ${e.message} ${e.stack}`);
            }
            finally {
                yield session.close();
                yield driver.close();
            }
        });
    }
    return {
        setters: [
            function (jsonlines_1_1) {
                jsonlines_1 = jsonlines_1_1;
            },
            function (logging_1_1) {
                logging_1 = logging_1_1;
            },
            function (fs_1) {
                fs = fs_1;
            },
            function (R_1) {
                R = R_1;
            },
            function (streams_1_1) {
                streams_1 = streams_1_1;
            },
            function (path_1_1) {
                path_1 = path_1_1;
            },
            function (index_1_1) {
                index_1 = index_1_1;
            },
            function (result_stream_1_1) {
                result_stream_1 = result_stream_1_1;
            },
            function (neo4j_date_1_1) {
                neo4j_date_1 = neo4j_date_1_1;
            },
            function (neo4j_1) {
                neo4j = neo4j_1;
            }
        ],
        execute: function () {
            log = logging_1.create("import");
            basedir = path_1.dirname(path_1.dirname(module.filename));
            braindir = path_1.join(basedir, 'brain');
            user = 'neo4j';
            password = 'admin';
            uri = 'bolt://localhost:7687';
            // ID of node representing root of the node _Type hierarchy
            ID_ROOT_TYPE = 'ROOT-TYPE';
            // ID of node representing root of the _Tag hierarchy.
            // No hierarchy is currently implemented, but intent is to produce queries for all subtags.
            ID_ROOT_TAG = 'ROOT-TAG';
            // ID of node representing the root of the _Special hierarchy. This is trivial, containing one special, Pinned.
            ID_ROOT_SPECIAL = 'ROOT-SPECIAL';
            // ID of node representing the root of the _Link hierarchy.
            ID_ROOT_LINK = 'ROOT-LINK';
            // The Neo4J labels we apply to each of our meta types.
            L_TYPE = "_Type:_Meta";
            // A tag. Linked to nodes via a _TAG link.
            L_TAG = "_Tag:_Meta";
            // Special in Brain refers to the special Pinned node that identifies pins.
            L_SPECIAL = "_Special:_Meta";
            // A node that identifies a link type.  It is a node so supertype relations can be modelled.
            // (Brain does not support this, and Neo4J doesn't quite really, either, but we can fake it.)
            L_LINK = "_Link:_Meta";
            // Statement to create the roots of our metatype hierarchies.
            C_ROOTS = `
MERGE (x:_Meta:_Node {name: "--NULL--", label: '--NULL--', id: "${index_1.ID_NULL_NODE}"})
MERGE (n:${L_TYPE} {name: "_Node", label: "Node", id: "${ID_ROOT_TYPE}"})
MERGE (t:${L_TAG} {name: "Tag", label: "Tag", id: "${ID_ROOT_TAG}"})
MERGE (s:${L_SPECIAL} {name: "Special", label: "Special", id: "${ID_ROOT_SPECIAL}"})
MERGE (l:${L_LINK} {name: "Link", label: "Link", id: "${ID_ROOT_LINK}"})
RETURN *;`;
            // Statement to link the top nodes to the roots of the metadata hierarchies.
            C_LINK_ROOTS = `
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
            C_ADD_TYPE = `
MERGE(n:${L_TYPE} {id: $id})
SET n += $props;`;
            // Statement to add a tag.
            C_ADD_TAG = `
MERGE(n:${L_TAG} {id: $id})
SET n += $props;`;
            // Statement to add a special.
            C_ADD_SPECIAL = `
MERGE(n:${L_SPECIAL} {id: $id})
SET n += $props;`;
            // Statement to add a Link type.
            C_ADD_LINK = `
MERGE(n:${L_LINK} {id: $id})
SET n += $props;`;
            // Define our id: uniqueness constraint
            C_ID_CONSTRAINT_NODE = "CREATE CONSTRAINT ON (n:_Node) assert n.id IS UNIQUE;";
            C_ID_CONSTRAINT_META = "CREATE CONSTRAINT ON (n:_Meta) assert n.id IS UNIQUE;";
            // We don't constraint uniqueness for general node names, only metadata.
            C_INDEX_NODE_NAME = "CREATE INDEX ON :_Node(name)";
            C_INDEX_NODE_LABEL = "CREATE INDEX ON :_Node(label)";
            C_CONSTRAINT_TYPE_NAME = "CREATE CONSTRAINT ON (t:_Type) ASSERT t.name IS UNIQUE";
            C_INDEX_TYPE_LABEL = "CREATE INDEX ON :_Type(label)";
            C_CONSTRAINT_TAG_NAME = "CREATE CONSTRAINT ON (t:_Tag) ASSERT t.name IS UNIQUE";
            C_INDEX_TAG_LABEL = "CREATE INDEX ON :_Tag(label)";
            C_CONSTRAINT_LINK_NAME = "CREATE CONSTRAINT ON (l:_Link) ASSERT l.name IS UNIQUE";
            C_INDEX_LINK_LABEL = "CREATE INDEX ON :_Link(label)";
            C_CONSTRAINT_SPECIAL_NAME = "CREATE CONSTRAINT ON (s:_Special) ASSERT s.name IS UNIQUE";
            C_INDEX_SPECIAL_LABEL = "CREATE INDEX ON :_Special(label)";
            // Load the type labels
            C_LOAD_TYPE_LABELS = `
MATCH path=(p)-[:_SUPER *1..10]->(s {id: "ROOT-TYPE"})
WITH DISTINCT path, p, s
RETURN p.id AS id, REDUCE(s=p.name, x IN TAIL(NODES(path)) | s + ':' + x.name) AS labels;`;
            /**
             * Table of node types.
             * @type {{}}
             */
            TYPES = {
                [index_1.ID_NULL_NODE]: {
                    Id: index_1.ID_NULL_NODE,
                    link_label: 'Node:_Node'
                }
            };
            /**
             * Table of tags
             * @type {{}}
             */
            TAGS = {};
            /**
             * Table of special nodes
             * @type {{}}
             */
            SPECIALS = {};
            /**
             * Table of link types
             * @type {{}}
             */
            LINKS = {};
            LINKS[index_1.ID_NULL_NODE] = {};
            /**
             *
             * @type {string[]}
             */
            OMIT_PROPS = ['Name', 'Label', 'CreationDateTime', 'ModificationDateTime', 'BrainId', 'ThoughtIdA', 'ThoughtIdB', 'Id'];
            RE_LABEL = /[^a-zA-Z0-9:]/g;
            util = require('util');
            load()
                .catch(() => process.exit(-1));
        }
    };
});
//# sourceMappingURL=load.js.map