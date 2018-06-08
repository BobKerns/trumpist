/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as yargs from "yargs";
import {load} from "../import/load";
import {dirname, join} from "path";
import {FilesystemSource} from "../import/source";

// Compute the default location of the brain data.
const basedir = dirname(dirname(dirname(module.filename)));
const braindir = join(basedir, 'brain');


const argv = yargs
    .strict()
    .help()
    .version()
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
    .demandCommand(1, "You must supply a command.")
    .argv;
