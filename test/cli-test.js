import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import process from 'node:process';
import {
    mkdtemp,
    rm,
    readFile,
    writeFile,
    mkdir,
} from 'node:fs/promises';
import {test, stub} from 'supertape';
import {tryToCatch} from 'try-to-catch';
import {
    run,
    runParse,
    runFind,
    runTransform,
    runPrint,
    main,
} from '../bin/putnik.js';
import {loadSqlPlugin, parse} from '../lib/putnik.js';

const pluginConstToLet = loadSqlPlugin(new URL('../lib/sql-plugin/fixture/const-to-let.sql', import.meta.url).pathname);

const PLUGINS = [
    ['const-to-let', pluginConstToLet],
];

const createDir = async () => mkdtemp(join(tmpdir(), 'putnik-cli-'));

test('putnik: cli: run: fix writes transformed files back', async (t) => {
    const dir = await createDir();
    const name = join(dir, 'a.js');
    
    await writeFile(name, 'const a = 1;\n');
    
    await run({
        pattern: join(dir, '*.js'),
        fix: true,
        plugins: PLUGINS,
    });
    
    const result = await readFile(name, 'utf8');
    
    await rm(dir, {
        recursive: true,
        force: true,
    });
    
    t.equal(result, 'let a = 1;\n');
    t.end();
});

test('putnik: cli: run: no fix reports places', async (t) => {
    const dir = await createDir();
    const name = join(dir, 'a.js');
    
    await writeFile(name, 'const a = 1;\n');
    
    const {places} = await run({
        pattern: join(dir, '*.js'),
        fix: false,
        plugins: PLUGINS,
    });
    
    await rm(dir, {
        recursive: true,
        force: true,
    });
    
    t.ok(places.length);
    t.end();
});

test('putnik: cli: run: no fix leaves files untouched', async (t) => {
    const dir = await createDir();
    const name = join(dir, 'a.js');
    const source = 'const a = 1;\n';
    
    await writeFile(name, source);
    
    await run({
        pattern: join(dir, '*.js'),
        fix: false,
        plugins: PLUGINS,
    });
    
    const result = await readFile(name, 'utf8');
    
    await rm(dir, {
        recursive: true,
        force: true,
    });
    
    t.equal(result, source);
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
    
    await rm(dir, {
        recursive: true,
        force: true,
    });
    const result = aSource + bSource;
    const expected = 'let a = 1;\nlet b = 2;\n';
    
    t.equal(result, expected);
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
    
    await rm(dir, {
        recursive: true,
        force: true,
    });
    
    t.ok(output.includes('const-to-let') || output.includes('a.js'));
    t.end();
});

test('putnik: cli: run: no places yields no places', async (t) => {
    const dir = await createDir();
    const name = join(dir, 'a.js');
    
    await writeFile(name, 'let a = 1;\n');
    
    const {places} = await run({
        pattern: join(dir, '*.js'),
        fix: false,
        plugins: PLUGINS,
    });
    
    await rm(dir, {
        recursive: true,
        force: true,
    });
    
    t.notOk(places.length);
    t.end();
});

test('putnik: cli: run: no places yields empty output', async (t) => {
    const dir = await createDir();
    const name = join(dir, 'a.js');
    
    await writeFile(name, 'let a = 1;\n');
    
    const {output} = await run({
        pattern: join(dir, '*.js'),
        fix: false,
        plugins: PLUGINS,
    });
    
    await rm(dir, {
        recursive: true,
        force: true,
    });
    
    t.equal(output, '');
    t.end();
});

test('putnik: cli: run: ignores node_modules by default', async (t) => {
    const dir = await createDir();
    const modules = join(dir, 'node_modules');
    
    await mkdir(modules, {
        recursive: true,
    });
    await writeFile(join(modules, 'a.js'), 'const a = 1;\n');
    
    const {places} = await run({
        pattern: join(dir, '**/*.js'),
        fix: false,
        plugins: PLUGINS,
    });
    
    await rm(dir, {
        recursive: true,
        force: true,
    });
    
    t.equal(places.length, 0);
    t.end();
});

test('putnik: cli: run: injectable fs: fix writes to injected fs', async (t) => {
    const files = new Map([
        ['a.js', 'const a = 1;\n'],
    ]);
    
    const fs = {
        readFile: async (name) => {
            if (!files.has(name))
                throw Error(`ENOENT: ${name}`);
            
            return files.get(name);
        },
        writeFile: (name, contents) => {
            files.set(name, contents);
        },
    };
    
    const glob = stub().resolves(['a.js']);
    
    await run({
        pattern: 'a.js',
        fix: true,
        fs,
        glob,
        plugins: PLUGINS,
    });
    const result = files.get('a.js');
    const expected = 'let a = 1;\n';
    
    t.equal(result, expected);
    t.end();
});

test('putnik: cli: run: injectable fs: reports places', async (t) => {
    const files = new Map([
        ['a.js', 'const a = 1;\n'],
    ]);
    
    const fs = {
        readFile: async (name) => {
            if (!files.has(name))
                throw Error(`ENOENT: ${name}`);
            
            return files.get(name);
        },
        writeFile: (name, contents) => {
            files.set(name, contents);
        },
    };
    
    const glob = stub().resolves(['a.js']);
    
    const {places} = await run({
        pattern: 'a.js',
        fix: true,
        fs,
        glob,
        plugins: PLUGINS,
    });
    
    t.ok(places.length);
    t.end();
});

test('putnik: cli: main: sets exit code on unfixed places', async (t) => {
    const dir = await createDir();
    const name = join(dir, 'a.js');
    
    await writeFile(name, 'const a = 1;\na = 2;\n');
    
    process.exitCode = 0;
    
    await main([
        join(dir, '*.js'),
    ]);
    await rm(dir, {
        recursive: true,
        force: true,
    });
    
    t.equal(process.exitCode, 1);
    t.end();
});

test('putnik: cli: main: fix mode writes transformed file', async (t) => {
    const dir = await createDir();
    const name = join(dir, 'a.js');
    
    await writeFile(name, 'debugger;\nfoo();\n');
    
    process.exitCode = 0;
    
    await main(['--fix', join(dir, '*.js')]);
    const result = await readFile(name, 'utf8');
    
    await rm(dir, {
        recursive: true,
        force: true,
    });
    
    t.equal(result, 'foo();\n');
    t.end();
});

test('putnik: cli: main: fix mode clears exit code', async (t) => {
    const dir = await createDir();
    const name = join(dir, 'a.js');
    
    await writeFile(name, 'const a = 1;\na = 2;\n');
    
    process.exitCode = 0;
    
    await main(['--fix', join(dir, '*.js')]);
    await rm(dir, {
        recursive: true,
        force: true,
    });
    
    t.notOk(process.exitCode);
    t.end();
});

test('putnik: cli: run: preserves top comment on fix', async (t) => {
    const dir = await createDir();
    const name = join(dir, 'a.js');
    
    await writeFile(name, '// top\nconst a = 1; // inline\n');
    
    await run({
        pattern: join(dir, '*.js'),
        fix: true,
        plugins: PLUGINS,
    });
    
    const result = await readFile(name, 'utf8');
    
    await rm(dir, {
        recursive: true,
        force: true,
    });
    
    t.match(result, '// top');
    t.end();
});

test('putnik: cli: run: preserves inline comment on fix', async (t) => {
    const dir = await createDir();
    const name = join(dir, 'a.js');
    
    await writeFile(name, '// top\nconst a = 1; // inline\n');
    
    await run({
        pattern: join(dir, '*.js'),
        fix: true,
        plugins: PLUGINS,
    });
    
    const result = await readFile(name, 'utf8');
    
    await rm(dir, {
        recursive: true,
        force: true,
    });
    
    t.match(result, '// inline');
    t.end();
});

test('putnik: cli: run: plugin that needs scope sees Binding', async (t) => {
    const dir = await createDir();
    const name = join(dir, 'a.js');
    
    await writeFile(name, 'const a = 1;\n');
    
    const {places} = await run({
        pattern: join(dir, '*.js'),
        fix: false,
        plugins: [
            ['binding', {
                needsScope: true,
                select: `SELECT id FROM Binding WHERE file = :file`,
                report: `SELECT 'Binding found' AS message, 1 AS line, 0 AS col`,
            }],
        ],
    });
    
    await rm(dir, {
        recursive: true,
        force: true,
    });
    
    t.equal(places.length, 1);
    t.end();
});

test('putnik: cli: run: default pattern has TypeScript files', async (t) => {
    const glob = stub().resolves([]);
    
    await run({
        glob,
        plugins: PLUGINS,
    });
    
    const [[pattern]] = glob.args;
    
    t.match(pattern, '{js,mjs,cjs,jsx,ts,mts,cts,tsx,json}');
    t.end();
});

test('putnik: cli: run: fixes a TypeScript file', async (t) => {
    const files = new Map([
        ['a.ts', 'const a: number = 1;\n'],
    ]);
    
    const fs = {
        readFile: async (name) => files.get(name),
        writeFile: (name, contents) => {
            files.set(name, contents);
        },
    };
    
    const glob = stub().resolves(['a.ts']);
    
    await run({
        fix: true,
        fs,
        glob,
        plugins: PLUGINS,
    });
    
    const result = files.get('a.ts');
    const expected = 'let a: number = 1;\n';
    
    t.equal(result, expected);
    t.end();
});

const createProject = async (files) => {
    const dir = await createDir();
    
    for (const [name, source] of Object.entries(files))
        await writeFile(join(dir, name), source);
    
    return {
        dir,
        database: join(dir, '.putnik', 'putnik.db'),
        pattern: join(dir, '*.js'),
        remove: () => rm(dir, {
            recursive: true,
            force: true,
        }),
    };
};

test('putnik: cli: runParse: returns the count of files', async (t) => {
    const {
        database,
        pattern,
        remove,
    } = await createProject({
        'a.js': 'let a = 1;\n',
        'b.js': 'let b = 1;\n',
    });
    
    const {filesCount} = await runParse({
        database,
        pattern,
    });
    
    await remove();
    
    t.equal(filesCount, 2);
    t.end();
});

test('putnik: cli: runFind: reports the places of the database', async (t) => {
    const {
        database,
        pattern,
        remove,
    } = await createProject({
        'a.js': 'debugger;\n',
    });
    
    await runParse({
        database,
        pattern,
    });
    
    const {places} = await runFind({
        database,
    });
    
    await remove();
    
    t.equal(places.length, 1);
    t.end();
});

test('putnik: cli: runFind: does not change the files', async (t) => {
    const {
        dir,
        database,
        pattern,
        remove,
    } = await createProject({
        'a.js': 'debugger;\n',
    });
    
    await runParse({
        database,
        pattern,
    });
    await runFind({
        database,
    });
    
    const result = await readFile(join(dir, 'a.js'), 'utf8');
    
    await remove();
    
    t.equal(result, 'debugger;\n');
    t.end();
});

test('putnik: cli: runTransform: does not write the files', async (t) => {
    const {
        dir,
        database,
        pattern,
        remove,
    } = await createProject({
        'a.js': 'debugger;\nfoo();\n',
    });
    
    await runParse({
        database,
        pattern,
    });
    await runTransform({
        database,
    });
    
    const result = await readFile(join(dir, 'a.js'), 'utf8');
    
    await remove();
    
    t.equal(result, 'debugger;\nfoo();\n');
    t.end();
});

test('putnik: cli: runPrint: writes the transformed files', async (t) => {
    const {
        dir,
        database,
        pattern,
        remove,
    } = await createProject({
        'a.js': 'debugger;\nfoo();\n',
    });
    
    await runParse({
        database,
        pattern,
    });
    await runTransform({
        database,
    });
    await runPrint({
        database,
    });
    
    const result = await readFile(join(dir, 'a.js'), 'utf8');
    
    await remove();
    
    t.equal(result, 'foo();\n');
    t.end();
});

test('putnik: cli: runPrint: writes only the changed files', async (t) => {
    const {
        dir,
        database,
        pattern,
        remove,
    } = await createProject({
        'a.js': 'debugger;\nfoo();\n',
        'b.js': 'bar(  1 );\n',
    });
    
    await runParse({
        database,
        pattern,
    });
    await runTransform({
        database,
    });
    
    const {files} = await runPrint({
        database,
    });
    
    const result = await readFile(join(dir, 'b.js'), 'utf8');
    
    await remove();
    const expected = [
        [
            join(dir, 'a.js'),
        ],
        'bar(  1 );\n',
    ];
    
    t.deepEqual([files, result], expected);
    t.end();
});

test('putnik: cli: runPrint: second find reports nothing', async (t) => {
    const {
        database,
        pattern,
        remove,
    } = await createProject({
        'a.js': 'debugger;\nfoo();\n',
    });
    
    await runParse({
        database,
        pattern,
    });
    await runTransform({
        database,
    });
    await runPrint({
        database,
    });
    
    const {places} = await runFind({
        database,
    });
    
    await remove();
    const result = places;
    const expected = [];
    
    t.deepEqual(result, expected);
    t.end();
});

test('putnik: cli: runPrint: the file changed on the disk after parse', async (t) => {
    const {
        dir,
        database,
        pattern,
        remove,
    } = await createProject({
        'a.js': 'debugger;\nfoo();\n',
    });
    
    await runParse({
        database,
        pattern,
    });
    await runTransform({
        database,
    });
    await writeFile(join(dir, 'a.js'), 'debugger;\nbar();\n');
    
    const [error] = await tryToCatch(runPrint, {
        database,
    });
    
    await remove();
    
    t.match(error.message, 'is changed on the disk after');
    t.end();
});

test('putnik: cli: runFind: the database has no files', async (t) => {
    const {
        database,
        pattern,
        remove,
    } = await createProject({});
    
    await runParse({
        database,
        pattern,
    });
    
    const [error] = await tryToCatch(runFind, {
        database,
    });
    
    await remove();
    
    t.match(error.message, `run 'putnik parse'`);
    t.end();
});

test('putnik: cli: runFind: the database has no bindings', async (t) => {
    const {
        dir,
        database,
        remove,
    } = await createProject({});
    
    await mkdir(dirname(database), {
        recursive: true,
    });
    
    const db = await parse(join(dir, 'a.js'), 'let a = 1;\n', {
        database,
    });
    
    await db.end();
    
    const [error] = await tryToCatch(runFind, {
        database,
    });
    
    await remove();
    
    t.match(error.message, `no 'Binding'`);
    t.end();
});

test('putnik: cli: main: parse, find, transform, print with --file', async (t) => {
    const {
        dir,
        database,
        pattern,
        remove,
    } = await createProject({
        'a.js': 'debugger;\nfoo();\n',
    });
    
    const file = `--file=${database}`;
    
    await main(['parse', pattern, file]);
    await main(['find', file]);
    
    const {exitCode} = process;
    
    process.exitCode = 0;
    
    await main(['transform', file]);
    await main(['print', file]);
    
    const result = await readFile(join(dir, 'a.js'), 'utf8');
    
    await remove();
    const expected = [1, 'foo();\n'];
    
    t.deepEqual([exitCode, result], expected);
    t.end();
});

test('putnik: cli: main: parse reads .putnik.toml', async (t) => {
    const {
        dir,
        database,
        remove,
    } = await createProject({
        'a.js': 'debugger;\nfoo();\n',
    });
    
    await writeFile(join(dir, '.putnik.toml'), `file = "${database}"\ninclude = ["${join(dir, '*.js')}"]\n`);
    
    await main(['parse'], dir);
    await main(['transform'], dir);
    await main(['print'], dir);
    
    const result = await readFile(join(dir, 'a.js'), 'utf8');
    
    await remove();
    
    t.equal(result, 'foo();\n');
    t.end();
});

test('putnik: cli: main: parse without a database', async (t) => {
    const {
        dir,
        pattern,
        remove,
    } = await createProject({
        'a.js': 'debugger;\n',
    });
    
    const [error] = await tryToCatch(main, ['parse', pattern], dir);
    
    await remove();
    
    t.match(error.message, `Specify '--file'`);
    t.end();
});

test('putnik: cli: main: no arguments prints usage', async (t) => {
    const error = stub();
    const original = console.error;
    
    console.error = error;
    await main([]);
    console.error = original;
    
    process.exitCode = 0;
    
    t.calledWith(error, [`Usage: putnik [--fix] <pattern>
       putnik parse [<pattern>] [--file=<path> | --url=<postgres url>]
       putnik find | transform | print [--file=<path> | --url=<postgres url>]`]);
    t.end();
});

test('putnik: cli: run: package.json main is an entry', async (t) => {
    const dir = await createDir();
    const cwd = join(dir, 'a.js');
    const plugin = loadSqlPlugin(new URL('../lib/plugins/remove-unused-exports.sql', import.meta.url).pathname);
    
    await writeFile(cwd, 'export const a = 1;\n');
    await writeFile(join(dir, 'b.js'), 'export const b = 1;\n');
    await writeFile(join(dir, 'package.json'), '{"main": "./a.js"}');
    
    const {places} = await run({
        pattern: join(dir, '*.{js,json}'),
        plugins: [
            ['remove-unused-exports', plugin],
        ],
    });
    
    await rm(dir, {
        recursive: true,
        force: true,
    });
    
    const files = [];
    
    for (const {file} of places)
        files.push(file);
    
    const expected = [
        join(dir, 'b.js'),
    ];
    
    t.deepEqual(files, expected);
    t.end();
});

test('putnik: cli: run: default rules: let to const and const to let', async (t) => {
    const dir = await createDir();
    const name = join(dir, 'a.js');
    
    await writeFile(name, 'let a = 1;\nconst b = 1;\n\nb = 2;\nconsole.log(a, b);\n');
    
    await run({
        fix: true,
        pattern: join(dir, '*.js'),
    });
    
    const result = await readFile(name, 'utf8');
    
    await rm(dir, {
        recursive: true,
        force: true,
    });
    
    const expected = 'const a = 1;\nlet b = 1;\n\nb = 2;\n';
    
    t.equal(result, expected);
    t.end();
});
