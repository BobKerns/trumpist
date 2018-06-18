/*
 * Copyright (c) 2018 Bob Kerns.
 */
/*
require("leaked-handles").set({
    fullStack: true,
    timout: 3000,
    debugSockets: true
});
 */
import 'source-map-support/register';
import * as yargs from "yargs";
import {load} from "../import/load";
import {dirname, join} from "path";
import {FilesystemSource} from "../import/source";
import {InitApp} from "./InitApp";

// Compute the default location of the brain data.
const basedir = dirname(dirname(dirname(module.filename)));
const braindir = join(basedir, 'brain');


const argv = yargs
    .strict()
    .help()
    .version()
    .option('debug', {
        description: "Enable debug logging",
        boolean: true,
    })
    .option('trace', {
        description: "Enable trace logging",
        boolean: true,
    })
    .command('import', "Import a brain",
        (yyargs) => yyargs
            .option('brz', {
                description: 'Location of a .brz file to import',
            })
            .option('dir', {
                description: 'location of a directory to import',
                default: braindir,
            }),
        (yargv) => load(new FilesystemSource(yargv.dir)))
    .command('init', 'Initialize a database',
            yyargs => yyargs
                .option('preview', {
                    description: 'Preview the operations to be peformed.',
                    boolean: true,
                }),
        yargv => new InitApp(yargv)
            .run())
    .demandCommand(1, "You must supply a command.")
    .exitProcess(true)
    .argv;
