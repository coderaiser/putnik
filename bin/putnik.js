#!/usr/bin/env node

import {dirname} from 'node:path';
import {
    readFile as readFileFs,
    writeFile as writeFileFs,
    mkdir,
} from 'node:fs/promises';
import process from 'node:process';
import {pathToFileURL} from 'node:url';
import globFS from 'fast-glob';
import dump from '@putout/formatter-dump';
import {
    createDb,
    parse,
    transformAll,
    print,
    loadSqlPlugin,
} from '../lib/putnik.js';
import {
    getChanged,
    clearChanged,
    getFiles,
    getHash,
    hasBindings,
    isFresh,
    saveHash,
} from '../lib/sync.js';
import {getDatabase, readConfig} from '../lib/config.js';

const isString = (a) => typeof a === 'string';

const DEFAULT_PATTERN = '**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx,json}';
const DEFAULT_IGNORE = ['**/node_modules/**'];

const DEFAULT_RULES = [
    'apply-is-nan',
    'convert-const-to-let',
    'convert-let-to-const',
    'merge-duplicate-imports',
    'remove-console',
    'remove-debugger',
    'remove-duplicate-keys',
    'remove-empty-block',
    'remove-unused-exports',
    'remove-unused-variables',
];

const loadDefault = (name) => [name, loadSqlPlugin(new URL(`../lib/plugins/${name}.sql`, import.meta.url).pathname)];

const DEFAULT_PLUGINS = DEFAULT_RULES.map(loadDefault);

const realFS = {
    readFile: (name) => readFileFs(name, 'utf8'),
    writeFile: (name, contents) => writeFileFs(name, contents),
};

const needsScope = (plugins) => plugins.some(([, plugin]) => plugin.needsScope);

const readFiles = async ({fs, glob, pattern, ignore}) => {
    const names = await glob(pattern, {
        ignore,
        absolute: true,
    });
    
    const sources = [];
    
    for (const name of names)
        sources.push(await fs.readFile(name));
    
    return {
        names,
        sources,
    };
};

const createOutput = (name, places, filesCount) => dump({
    name,
    places,
    index: 0,
    count: 1,
    filesCount,
    errorsCount: places.length,
});

const printChanged = async (db, fs) => {
    const written = [];
    
    for (const file of await getChanged(db)) {
        const disk = await fs.readFile(file);
        
        if (!await isFresh(db, file, getHash(disk)))
            throw Error(`'${file}' is changed on the disk after 'parse'`);
        
        const source = await print(file, db);
        
        await fs.writeFile(file, source);
        await saveHash(db, file, getHash(source));
        await clearChanged(db, file);
        written.push(file);
    }
    
    return written;
};

const openParsed = async (database, plugins) => {
    const db = await createDb(database);
    const files = await getFiles(db);
    
    if (!files.length)
        throw Error(`The database has no files, run 'putnik parse'`);
    
    if (needsScope(plugins) && !await hasBindings(db))
        throw Error(`The database has no 'Binding', run 'putnik parse'`);
    
    return {
        db,
        files,
    };
};

export const run = async (overrides = {}) => {
    const {
        pattern = DEFAULT_PATTERN,
        ignore = DEFAULT_IGNORE,
        fix = false,
        fs = realFS,
        glob = globFS,
        plugins = DEFAULT_PLUGINS,
        rules = {},
    } = overrides;
    
    const {names, sources} = await readFiles({
        fs,
        glob,
        pattern,
        ignore,
    });
    
    const db = await parse(names, sources, {
        bindings: needsScope(plugins),
    });
    
    const places = await transformAll(names, db, {
        fix,
        plugins,
        rules,
    });
    
    if (fix)
        await printChanged(db, fs);
    
    await db.end();
    
    return {
        places,
        output: createOutput(pattern, places, names.length),
    };
};

export const runParse = async (overrides) => {
    const {
        database,
        pattern = DEFAULT_PATTERN,
        ignore = DEFAULT_IGNORE,
        fs = realFS,
        glob = globFS,
    } = overrides;
    
    const {names, sources} = await readFiles({
        fs,
        glob,
        pattern,
        ignore,
    });
    
    if (isString(database))
        await mkdir(dirname(database), {
            recursive: true,
        });
    
    const db = await parse(names, sources, {
        bindings: true,
        database,
    });
    
    await db.end();
    
    return {
        filesCount: names.length,
    };
};

const runRules = async ({database, plugins, rules, fix}) => {
    const {db, files} = await openParsed(database, plugins);
    
    const places = await transformAll(files, db, {
        fix,
        plugins,
        rules,
    });
    
    await db.end();
    
    return {
        places,
        output: createOutput('database', places, files.length),
    };
};

export const runFind = ({database, plugins = DEFAULT_PLUGINS, rules = {}}) => runRules({
    database,
    plugins,
    rules,
    fix: false,
});

export const runTransform = ({database, plugins = DEFAULT_PLUGINS, rules = {}}) => runRules({
    database,
    plugins,
    rules,
    fix: true,
});

export const runPrint = async ({database, fs = realFS}) => {
    const {db} = await openParsed(database, []);
    const files = await printChanged(db, fs);
    
    await db.end();
    
    return {
        files,
    };
};

const getFlag = (argv, name) => {
    const prefix = `--${name}=`;
    const flag = argv.find((a) => a.startsWith(prefix));
    
    if (!flag)
        return '';
    
    return flag.slice(prefix.length);
};

const COMMANDS = new Set([
    'parse',
    'find',
    'transform',
    'print',
]);

const getPositional = (argv) => argv.filter((a) => !a.startsWith('--'));

const USAGE = `Usage: putnik [--fix] <pattern>
       putnik parse [<pattern>] [--file=<path> | --url=<postgres url>]
       putnik find | transform | print [--file=<path> | --url=<postgres url>]`;

const runCommand = async (command, argv, config) => {
    const database = getDatabase({
        file: getFlag(argv, 'file'),
        url: getFlag(argv, 'url'),
    }, config);
    
    if (command === 'parse') {
        const [, pattern] = getPositional(argv);
        const {filesCount} = await runParse({
            database,
            pattern: pattern || config.include && config.include[0] || DEFAULT_PATTERN,
            ignore: config.ignore || DEFAULT_IGNORE,
        });
        
        console.log(`Parsed ${filesCount} files`);
        
        return 0;
    }
    
    if (command === 'print') {
        const {files} = await runPrint({
            database,
        });
        
        console.log(`Printed ${files.length} files`);
        
        return 0;
    }
    
    const {places, output} = await runRules({
        database,
        plugins: DEFAULT_PLUGINS,
        rules: {},
        fix: command === 'transform',
    });
    
    if (output)
        console.log(output);
    
    return Number(command === 'find' && places.length > 0);
};

export const main = async (argv = process.argv.slice(2), cwd = process.cwd()) => {
    const [first] = getPositional(argv);
    
    if (COMMANDS.has(first)) {
        const config = await readConfig(realFS, cwd);
        
        process.exitCode = await runCommand(first, argv, config);
        
        return;
    }
    
    if (!first) {
        console.error(USAGE);
        process.exitCode = 1;
        
        return;
    }
    
    const fix = argv.includes('--fix');
    
    const {places, output} = await run({
        fix,
        pattern: first,
    });
    
    if (output)
        console.log(output);
    
    if (places.length && !fix)
        process.exitCode = 1;
};

const isMain = import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain)
    await main();
