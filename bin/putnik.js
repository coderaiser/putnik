#!/usr/bin/env node
import {readFile as readFileFs, writeFile as writeFileFs} from 'node:fs/promises';
import process from 'node:process';
import {pathToFileURL} from 'node:url';
import globFS from 'fast-glob';
import dump from '@putout/formatter-dump';
import {
    parse,
    transformAll,
    printAll,
    loadSqlPlugin,
} from '../lib/putnik.js';

const pluginConstToLet = loadSqlPlugin(new URL('../lib/plugins/const-to-let.sql', import.meta.url).pathname);

const DEFAULT_PLUGINS = [
    ['const-to-let', pluginConstToLet],
];

const realFS = {
    readFile: (name) => readFileFs(name, 'utf8'),
    writeFile: (name, contents) => writeFileFs(name, contents),
};

export const run = async ({
    pattern = '**/*.js',
    fix = false,
    fs = realFS,
    glob = globFS,
    plugins = DEFAULT_PLUGINS,
    rules = {},
} = {}) => {
    const filePaths = await glob(pattern, {
        ignore: ['**/node_modules/**'],
        absolute: true,
    });
    
    const sources = [];
    
    for (const file of filePaths)
        sources.push(await fs.readFile(file));
    
    const db = await parse(filePaths, sources);
    
    const places = await transformAll(filePaths, db, {
        fix,
        plugins,
        rules,
    });
    
    if (fix) {
        const printed = await printAll(filePaths, db);
        
        for (const [file, source] of printed)
            await fs.writeFile(file, source);
    }
    
    const output = dump({
        name: pattern,
        places,
        index: 0,
        count: 1,
        filesCount: filePaths.length,
        errorsCount: places.length,
    });
    
    return {
        places,
        output,
    };
};

export const main = async (argv = process.argv.slice(2)) => {
    const fix = argv.includes('--fix');
    const pattern = argv.find((a) => !a.startsWith('--'));
    
    const {places, output} = await run({
        fix,
        pattern,
    });
    
    if (output)
        console.log(output);
    
    if (places.length && !fix)
        process.exitCode = 1;
};

const isMain = import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain)
    await main();

