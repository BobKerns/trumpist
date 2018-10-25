/*
 * Copyright (c) 2018 Bob Kerns.
 */

import {FilesystemSource, Source} from "./source";
import {AnyParams, Extensible, Nullable, XForm} from "../util/types";
import {App} from "../cmd/app";
import {DbOptions, api} from "../database";
import * as brain from "../brain";
import {done, filter, logstream, pipeline, sink, thru} from "../util/streams";
import {v1 as neo4j} from "../dbs/neo4j/neo4j-driver";
import {queries} from "./import-neo4j-queries";
import {convertDateTime} from "../dbs/neo4j/neo4j-date";
import * as R from "ramda";
import {ILinkResult, INodeResult} from "./defs";
import {Duplex, Writable} from "stream";
import {resultStream} from "../database/result-stream";
import {attachLog} from "../util/future";
import {Level} from "../util/logging";
import * as util from "util";
const Q = new queries();

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

interface AnnoatedLink extends brain.ILink {
    link_label: string;
}

/**
 * Table of node types.
 */
const TYPES: AnyParams = {
    [brain.ID_NULL_NODE]: {
        Id: brain.ID_NULL_NODE,
        labels: ['Node', '_Node'],
    },
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

LINKS[brain.ID_NULL_NODE] = {};

const OMIT_PROPS = ['Name', 'Label', 'CreationDateTime', 'ModificationDateTime', 'ThoughtIdA', 'ThoughtIdB', 'Id'];

type DbVal1 = string | number | boolean | null;
/**
 * Types we can store in the Database.
 */
type DbVal = DbVal1 | DbVal1[] | {[k: string]: DbVal1};

const RE_LABEL = /[^a-zA-Z0-9:]/g;

function nodeOpts(node: brain.INode|brain.ILink): INodeResult {
    const t = node as Extensible<brain.INode, DbVal>;
    const brainKeys = R.difference(R.keys(t), OMIT_PROPS);
    const brainProps: AnyParams = {};
    const fix = (val: DbVal) => (typeof val === 'number' ? neo4j.int(val) : val);
    brainKeys.forEach(k => brainProps['brain_' + k] = fix(t[k]));
    const v = {
        id: t.Id,
        props: {
            name: t.Name,
            label: t.Label || t.Name,
            creationTime: convertDateTime(t.CreationDateTime),
            modifiedTime: convertDateTime(t.ModificationDateTime),
            ...brainProps,
        },
    };
    return v as any as INodeResult;
}

function linkOpts(t: brain.ILink): ILinkResult {
    const nodeReusult: any = nodeOpts(t);
    const result = nodeReusult as ILinkResult;
    const flags = t.Direction < 0 ? 0 : t.Direction;
    const hierarchy = result.props.hierarchy = ((t.Relation === 1) && (t.Meaning === brain.MEANING.NORMAL));
    const reversed = result.props.dir_reversed = (flags & brain.DIRECTION.REVERSED) > 0 || brain.MEANING_DESCRIPTORS[t.Meaning].reverse || false;
    result.props.dir_shown = (flags & brain.DIRECTION.DIRECTIONAL) > 0;
    result.props.dir_one_way = (flags & brain.DIRECTION.ONE_WAY) > 0;
    result.props.dir_specified = (flags & brain.DIRECTION.SPECIFIED) > 0;
    if (reversed && ((t.Meaning !== 1) || !hierarchy)) {
        result.from_id = t.ThoughtIdB;
        result.to_id = t.ThoughtIdA;
    } else {
        result.from_id = t.ThoughtIdA;
        result.to_id = t.ThoughtIdB;
    }
    return result;
}

function linkLabel(t: brain.ILink): string {
    return linkMeaningLabel(t) || linkProtoLabel(t);
}

function linkProtoLabel(t: brain.ILink) {
    const tid = t.TypeId;
    const proto = tid && LINKS[tid];
    if (proto) {
        return proto.Name;
    }
    return 'Link';
}

function linkMeaningLabel(t: brain.ILink) {
    const info = brain.MEANING_DESCRIPTORS[t.Meaning];
    if (!info) {
        throw new Error(`Unknown Brain link Meaning: ${t.Meaning}`);
    }
    return info.label;
}

type ThruBuilder<F, T, S extends Duplex> = (s: XForm<F, T>) => S;

/**
 * Convert a stream builder to one that destroys the pipe on error.
 * @param tailFn -- a future value of tail, since we use this result in constructing it.
 * @param  checkedFn
 */
function checkStep<F, T, S extends Duplex>(tailFn: () => Writable, checkedFn: ThruBuilder<F, T, S>): ThruBuilder<F, T, S> {
    function check(f: XForm<F, T>): XForm<F, T> {
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

export class Loader extends App {
    private readonly source: Source;
    private readonly databaseSpec: AnyParams;
    constructor(options: AnyParams) {
        super(options);
        const {source, databaseSpec, dir}: {source?: Source, databaseSpec?: DbOptions, dir?: string} = options;
        if (source) {
            this.source = source;
        } else if (dir) {
            this.source = new FilesystemSource(dir);
        } else {
            throw new Error("Source or dir must be specified.");
        }
    }

    protected async doRun(): Promise<void> {
        this.runInSession(async session => {
            await this.loadMetadata(session);
            this.log.severe('Metadata Loaded');
            await this.loadNodes(session);
            await this.loadLinks(session);
        });
    }

    protected async loadMetadata(session: api.Session) {
        await this.loadNodeMetadata(session);
        await this.loadLinkMetadata(session);
        this.log.info('Linking to root types');
        await attachLog(session.withTransaction(api.Mode.WRITE, tx => tx.query(Q.LINK_ROOTS, {})),
            this.log, Level.severe);
        await attachLog(this.loadTypeLabels(session),
            this.log, Level.severe);
        return session;
    }

    protected async loadNodeMetadata(session: api.Session) {
        const input = this.source.open('thoughts.json');
        this.log.info(`Scanning ${input.path} for node metadata.`);
        await session.withTransaction(api.Mode.WRITE, tx => tx.query(Q.ID_CONSTRAINT_NODE));
        await session.withTransaction(api.Mode.WRITE, tx => tx.query(Q.INDEX_NODE_NAME));
        await session.withTransaction(api.Mode.WRITE, tx => tx.query(Q.INDEX_NODE_LABEL));
        await session.withTransaction(api.Mode.WRITE, tx => tx.query(Q.CONSTRAINT_TYPE_NAME));
        await session.withTransaction(api.Mode.WRITE, tx => tx.query(Q.INDEX_TYPE_LABEL));
        await session.withTransaction(api.Mode.WRITE, tx => tx.query(Q.CONSTRAINT_TAG_NAME));
        await session.withTransaction(api.Mode.WRITE, tx => tx.query(Q.INDEX_TAG_LABEL));
        await session.withTransaction(api.Mode.WRITE, tx => tx.query(Q.CONSTRAINT_LINK_NAME));
        await session.withTransaction(api.Mode.WRITE, tx => tx.query(Q.INDEX_LINK_LABEL));
        await session.withTransaction(api.Mode.WRITE, tx => tx.query(Q.CONSTRAINT_SPECIAL_NAME));
        await session.withTransaction(api.Mode.WRITE, tx => tx.query(Q.INDEX_SPECIAL_LABEL));
        await session.withTransaction(api.Mode.WRITE, tx => tx.query(Q.ROOTS));
        await session.withTransaction(api.Mode.WRITE, async tx => {
            const logstr = this.nodeLogger('Metadata', 'M');
            let dead: boolean;
            const fail = (e: Error) => {
                if (!dead) {
                    dead = true;
                    input.destroy(e);
                }
            };
            async function doMetadata(data: brain.INode) {
                if (dead) {
                    this.log.info(`Skipping ${data.Id} due to prior error`);
                    return false;
                }
                try {
                    switch (data.Kind) {
                        case brain.KIND.TYPE:
                            TYPES[data.Id] = data;
                            await tx.query(Q.ADD_TYPE, nodeOpts(data));
                            return true;
                        case brain.KIND.TAG:
                            TAGS[data.Id] = data;
                            await tx.query(Q.ADD_TAG, nodeOpts(data));
                            return true;
                        case brain.KIND.SPECIAL:
                            SPECIALS[data.Id] = data;
                            await tx.query(Q.ADD_SPECIAL, nodeOpts(data));
                            return true;
                        case brain.KIND.NODE:
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

    protected async loadTypeLabels(session: api.Session) {
        this.log.info('Loading composite node type labels from database');
        const failure: Nullable<Error> = null;
        const processData = (data: api.Record) => {
            const id = data.get('id');
            try {
                const cleanLabel = (v: string) => v.replace(RE_LABEL, '_');
                const labels = data.get('labels').split(':').map(cleanLabel);
                const type = TYPES[id];
                if (type) {
                    type.labels = labels;
                } else {
                    this.log.warn(`Missing or deleted type: ${id} ${data.get('labels')}`);
                }
                return data;
            } catch (e) {
                this.log.error(`FAIL: ${e.message} ${data.get('labels').join(':')} ${id}`);
                throw e;
            }
        };
        const recordTemplate = (data: api.Record) => `${data.get('id')}: ${TYPES[data.get('id')].labels}`;
        const log2 = this.countingLogger('Label', 'L', recordTemplate);
        const rs = await session.withTransaction(api.Mode.WRITE, async tx => {
            const qs = await tx.queryStream(Q.LOAD_TYPE_LABELS);
            let tail: Writable;
            const thru2 = checkStep(() => tail, thru);
            tail = qs.pipe(thru2(processData))
                .pipe(log2);
            await done(tail)
                .then(v => {
                    if (failure) {
                        throw failure;
                    }
                });
            return qs.getResultSummary();
        });
    }

    protected async loadLinkTypes(session: api.Session) {
        LINKS[ID_ROOT_LINK] = {
            id: ID_ROOT_LINK,
            Name: 'Link',
            link_label: 'Link',
        };
        const logstr = this.linkLogger('Link', 'L');
        const input = this.source.open(('links.json'));
        this.log.info(`Scanning ${input.path} for link metadata.`);
        await session.withTransaction(api.Mode.WRITE, tx => tx.query(Q.ID_CONSTRAINT_META));
        await session.withTransaction(api.Mode.WRITE, async tx => {
            const proc = (t: brain.ILink) => {
                return tx.query(Q.ADD_LINK, linkOpts(t));
            };
            return pipeline(
                input,
                filter(t => t.Meaning === brain.MEANING.PROTO),
                thru((t: Extensible<brain.ILink>) => t.link_label = linkLabel(t)),
                thru((t: Extensible<brain.ILink>) => LINKS[t.Id] = t),
                thru(proc),
                logstr,
            );
        });
        return session;
    }

    protected async loadSupertypeRelations(session: api.Session) {
        const logstr = this.linkLogger('Link', 'L');
        const input = this.source.open(('links.json'));
        this.log.info(`Scanning ${input.path} for supertype metadata.`);
        await session.withTransaction(api.Mode.WRITE, tx => tx.query(Q.ID_CONSTRAINT_META));
        await session.withTransaction(api.Mode.WRITE, async tx => {
            let dead = false;
            let tail: Writable;
            const thru2 = checkStep(() => tail, thru);
            const filter2 = checkStep(() => tail, filter);
            const proc = (t: Extensible<brain.ILink>) => {
                t.link_options = linkOpts(t);
                t.link_label = '_SUPER';
                return tx.query(this.getLinkStmt(t), t.link_options)
                    .catch(e => {
                        tail.emit('error', e);
                        throw e;
                    });
            };
            // noinspection JSUnresolvedFunction
            tail = input
                .pipe(filter2(t => t.Meaning === brain.MEANING.SUBTYPE))
                .pipe(thru2((t: brain.ILink) => LINKS[t.Id] = t))
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


    protected async loadLinkMetadata(session: api.Session) {
        await this.loadLinkTypes(session);
        await this.loadSupertypeRelations(session);
        return session;
    }

    protected getLinkStmt(t: Extensible<brain.ILink>) {
        const id = t.TypeId;
        if (id && !LINKS[id]) {
            throw new Error(`Missing type definition: ${id}`);
        }
        const existing = id &&  LINKS[id].statement;
        if (existing) {
            return existing;
        }
        const parent = (id && (LINKS[id].Name || LINKS[id].Label));
        const label =  parent || linkMeaningLabel(t) || LINKS[ID_ROOT_LINK].link_label;
        if (!label) {
            throw new Error('unknown link label');
        }
        const stmt = Q.LINK_STATEMENT.curry(`LINK_${label}`, {label: label});
        if (id) {
            LINKS[id].statement = stmt;
            t.statement = stmt;
            t.link_label = label;
        }
        return stmt;
    }

    protected async loadNodes(session: api.Session) {
        const input = this.source.open("thoughts.json");
        this.log.info(`Loading nodes from ${input.path}.`);
        await session.withTransaction(api.Mode.WRITE, async tx => {
            const logstr = this.nodeLogger('Nodes', 'N');
            await attachLog(pipeline(
                input,
                filter((t: brain.INode) => t.Kind === brain.KIND.NODE),
                thru((t: brain.INode) => tx.query(this.getNodeStmt(t), nodeOpts(t))),
                logstr,
            ), this.log, 'loadNodes', Level.info, Level.severe);
        });
        return session;
    }

    protected getNodeStmt(t: brain.INode) {
        const id = t.TypeId || brain.ID_NULL_NODE;
        const existing = TYPES[id].statement;
        if (existing) {
            return existing;
        }
        const labels = TYPES[id].labels;
        const stmt = Q.NODE_STATEMENT
            .curry(`NODE_${labels}`, {
                labels,
                brain_typeId: id,
            });
        TYPES[id].statement = stmt;
        return stmt;
    }

    /**
     * Load the actual link data.
     */
    public async loadLinks(session: api.Session) {
        const input = this.source.open('links.json');
        this.log.info(`Loading links from ${input.path}.`);
        await session.withTransaction(api.Mode.WRITE, async tx => {
            const logstr = this.linkLogger('Links', '-');
            const typeidLabel = (t: brain.ILink) => (t.TypeId && LINKS[t.TypeId] && LINKS[t.TypeId].Name);
            const v = await pipeline(
                input,
                filter(t => t.Meaning !== brain.MEANING.PROTO && t.Meaning !== brain.MEANING.SUBTYPE),
                thru((t: Extensible<brain.ILink>) => t.link_options = linkOpts(t)),
                thru((t: Extensible<brain.ILink>) =>
                    t.link_label = (typeidLabel(t) || linkMeaningLabel(t) || LINKS[ID_ROOT_LINK].link_label)),
                thru((t: Extensible<brain.ILink>) => tx.query(this.getLinkStmt(t), t.link_options)),
                logstr,
            );
            return v;
        });
    }

    /**
     * Get a data logging function
     */
    protected nodeLogger(tName: string, tag: string): Writable {
        const f = (data: brain.INode): string => {
            if (!data.Id) {
                throw data;
            }
            return `${data.Id} ${data.Kind} ${data.Name || 'Unnamed'} / ${data.Label || data.Name || 'Unnamed'}`;
        };
        return this.countingLogger(tName, tag, f);
    }

    /**
     * Get a data logging function
     */
    protected linkLogger(tName: string, tag: string) {
        const f = (data: AnnoatedLink) => {
            const opts = !data.Name
                ? ''
                : ` {Name: "${data.Name || '--'}"}`;
            return `${data.Id}: ${data.Kind}/${data.Meaning}/${data.Relation}/${data.Direction} (${data.ThoughtIdA})-[:${data.link_label || '?'}${opts ? `{${opts}}` : ""}]->(${data.ThoughtIdB})`;
        };
        return this.countingLogger(tName, tag, f);
    }

    /**
     * Get a stream that logs a count when it finishes.
     */
    protected countingLogger<F>(tName: string, tag: string, f: XForm<F, string>) {
        let counter = 0;
        function count(s: string): string {
            counter++;
            return s;
        }
        const stream = sink(logstream(this.log, tag, (data: F) => count(f(data))));
        stream.on('finish', () => this.log.info(`${tag}: ===> Loaded ${counter} ${tName} types`));
        return stream;
    }
}
