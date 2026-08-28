import {test} from 'supertape';
import {mkdtemp, rm, readFile, writeFile, mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {tryToCatch} from 'try-to-catch';
import {run, main} from '../bin/putnik.js';
import {loadSqlPlugin} from '../lib/putnik.js';

const pluginConstToLet = loadSqlPlugin(new URL('../lib/plugins/const-to-let.sql', import.meta.url).pathname);

const PLUGINS = [
    ['const-to-let', pluginConstToLet],
];

const createDir = async () => mkdtemp(join(tmpdir(), 'putnik-cli-'));

test('putnik: cli: run: fix writes transformed files back', async (t) => {
    const dir = await createDir();
    const name = join(dir, 'a.js');
    
    await writeFile(name, 'const a = 1;\n');
    
    const {places} = await run({
        pattern: join(dir, '*.js'),
        fix: true,
        plugins: PLUGINS,
    });
    
    const result = await readFile(name, 'utf8');
    await rm(dir, {recursive: true, force: true});
    
    t.equal(result, 'let a = 1;\n');
    t.end();
});

test('putnik: cli: run: no fix reports places and leaves files untouched', async (t) => {
    const dir = await createDir();
    const name = join(dir, 'a.js');
    const source = 'const a = 1;\n';
    
    await writeFile(name, source);
    
    const {places} = await run({
        pattern: join(dir, '*.js'),
        fix: false,
        plugins: PLUGINS,
    });
    
    const result = await readFile(name, 'utf8');
    await rm(dir, {recursive: true, force: true});
    
    t.ok(places.length && result === source);
    t.end();
});

test('putnik: cli: run: multi-file fix transforms both files', async (t) => {
    const dir = await createDir();
    const a = join(dir, 'a.js');
    const b = join(dir, 'b.js');
    
    await writeFile(a, 'const a = 1;\n');
    await writeFile(b, 'const b = 2;\n');
    
    await run({
        pattern: join(dir, '*.js'),
        fix: true,
        plugins: PLUGINS,
    });
    
    const [aSource, bSource] = await Promise.all([
        readFile(a, 'utf8'),
        readFile(b, 'utf8'),
    ]);
    await rm(dir, {recursive: true, force: true});
    
    t.equal(aSource + bSource, 'let a = 1;\nlet b = 2;\n');
    t.end();
});

test('putnik: cli: run: output uses putout dump formatter', async (t) => {
    const dir = await createDir();
    const name = join(dir, 'a.js');
    
    await writeFile(name, 'const a = 1;\n');
    
    const {output} = await run({
        pattern: join(dir, '*.js'),
        fix: false,
        plugins: PLUGINS,
    });
    await rm(dir, {recursive: true, force: true});
    
    t.ok(output.includes('const-to-let') || output.includes('a.js'));
    t.end();
});

test('putnik: cli: run: no places yields empty output', async (t) => {
    const dir = await createDir();
    const name = join(dir, 'a.js');
    
    await writeFile(name, 'let a = 1;\n');
    
    const {places, output} = await run({
        pattern: join(dir, '*.js'),
        fix: false,
        plugins: PLUGINS,
    });
    await rm(dir, {recursive: true, force: true});
    
    t.ok(!places.length && output === '');
    t.end();
});

test('putnik: cli: run: ignores node_modules by default', async (t) => {
    const dir = await createDir();
    const modules = join(dir, 'node_modules');
    
    await mkdir(modules, {recursive: true});
    await writeFile(join(modules, 'a.js'), 'const a = 1;\n');
    
    const {places} = await run({
        pattern: join(dir, '**/*.js'),
        fix: false,
        plugins: PLUGINS,
    });
    await rm(dir, {recursive: true, force: true});
    
    t.equal(places.length, 0);
    t.end();
});

test('putnik: cli: run: injectable fs keeps everything off disk', async (t) => {
    const files = new Map([
        ['a.js', 'const a = 1;\n'],
    ]);
    
    const fs = {
        readFile: async (name) => {
            if (!files.has(name))
                throw Error(`ENOENT: ${name}`);
            
            return files.get(name);
        },
        writeFile: async (name, contents) => {
            files.set(name, contents);
        },
    };
    
    const glob = async () => ['a.js'];
    
    const {places} = await run({
        pattern: 'a.js',
        fix: true,
        fs,
        glob,
        plugins: PLUGINS,
    });
    
    t.ok(places.length >= 0 && files.get('a.js') === 'let a = 1;\n');
    t.end();
});

test('putnik: cli: main: sets exit code on unfixed places', async (t) => {
    const dir = await createDir();
    const name = join(dir, 'a.js');
    
    await writeFile(name, 'const a = 1;\n');
    
    const {exitCode} = process;
    
    await main([join(dir, '*.js')]);
    await rm(dir, {recursive: true, force: true});
    
    t.equal(process.exitCode, 1);
    t.end();
});

test('putnik: cli: main: fix mode clears exit code', async (t) => {
    const dir = await createDir();
    const name = join(dir, 'a.js');
    
    await writeFile(name, 'const a = 1;\n');
    
    process.exitCode = 0;
    
    await main(['--fix', join(dir, '*.js')]);
    const result = await readFile(name, 'utf8');
    await rm(dir, {recursive: true, force: true});
    
    t.ok(result === 'let a = 1;\n' && !process.exitCode);
    t.end();
});

test('putnik: cli: run: preserves comments on fix', async (t) => {
    const dir = await createDir();
    const name = join(dir, 'a.js');
    
    await writeFile(name, '// top\nconst a = 1; // inline\n');
    
    const {places} = await run({
        pattern: join(dir, '*.js'),
        fix: true,
        plugins: PLUGINS,
    });
    
    const result = await readFile(name, 'utf8');
    await rm(dir, {recursive: true, force: true});
    
    t.ok(result.includes('// top') && result.includes('// inline'));
    t.end();
});
