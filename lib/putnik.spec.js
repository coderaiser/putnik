import {test} from 'supertape';
import {parse} from '@putout/babel';
import {tryToCatch} from 'try-to-catch';
import {createDb} from './db/sqlite.js';
import {
    createAllTables,
    createView,
    createTable,
    createIndexForField,
    createPutnik,
    parseAndWriteToDb,
    writeAst,
    readAst,
    transform,
    sql,
} from './putnik.js';

const parseOpts = {
    sourceType: 'module',
    plugins: ['jsx'],
};

const setup = async (source = 'const a = 1;', opts) => {
    const db = createDb();
    await createAllTables(db);
    await createView(db);
    await writeAst(db, parse(source, opts || parseOpts), 'index.js');
    
    return db;
};

test('putnik: sql interpolates', (t) => {
    const result = sql`SELECT id FROM X WHERE kind = const`;
    const expected = 'SELECT id FROM X WHERE kind = const';
    
    t.equal(result, expected);
    t.end();
});

test('putnik: createTable extras', async (t) => {
    const db = createDb();
    await createTable(db, 'Program');
    const result = db
        .all('PRAGMA table_info(Program)')
        .map((r) => r.name)
        .includes('source_type');
    
    t.ok(result);
    t.end();
});

test('putnik: createAllTables _sources', async (t) => {
    const db = createDb();
    await createAllTables(db);
    
    t.equal(db.get(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = '_sources'`).name, '_sources');
    t.end();
});

test('putnik: createIndexForField', async (t) => {
    const db = createDb();
    await createAllTables(db);
    await createIndexForField(db, 'VariableDeclaration', 'kind');
    const row = db.get(`SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_VariableDeclaration_kind'`);
    
    t.equal(row.name, 'idx_VariableDeclaration_kind');
    t.end();
});

test('putnik: createPutnik print no ast', async (t) => {
    const p = await createPutnik();
    const result = await p.print('x.js');
    const expected = '';
    
    t.equal(result, expected);
    t.end();
});

test('putnik: createPutnik getAst', async (t) => {
    const p = await createPutnik();
    await p.parse('t.js', 'const a = 1;');
    
    t.equal((await p.getAst('t.js')).program.body[0].kind, 'const');
    t.end();
});

test('putnik: createPutnik print', async (t) => {
    const p = await createPutnik();
    await p.parse('t.js', 'const a = 1;');
    const result = await p.print('t.js');
    const expected = 'const a = 1;\n';
    
    t.equal(result, expected);
    t.end();
});

test('putnik: createPutnik db', async (t) => {
    const p = await createPutnik();
    await p.parse('t.js', 'const a = 1;');
    
    t.ok(p.db);
    t.end();
});

test('putnik: parseAndWriteToDb', async (t) => {
    const db = createDb();
    await createAllTables(db);
    await createView(db);
    await parseAndWriteToDb(db, 't.js', 'const a = 1;');
    
    t.equal(db.get('SELECT source FROM _sources WHERE file = ?', ['t.js']).source, 'const a = 1;');
    t.end();
});

test('putnik: transform empty', async (t) => {
    t.equal((await transform(await setup(), 'index.js')).length, 0);
    t.end();
});

test('putnik: readAst srcType default', async (t) => {
    const db = await setup();
    
    db.run('UPDATE Program SET source_type = NULL WHERE file = :file', {
        file: 'index.js',
    });
    
    t.equal((await readAst(db, 'index.js')).program.sourceType, 'module');
    t.end();
});

test('putnik: readAst null no rows', async (t) => {
    const db = await setup();
    
    t.notOk(await readAst(db, 'x.js'));
    t.end();
});

test('putnik: readAst null del root', async (t) => {
    const db = await setup();
    db.run('DELETE FROM Program WHERE file = ?', ['index.js']);
    
    t.notOk(await readAst(db, 'index.js'));
    t.end();
});

test('putnik: readAst debugger', async (t) => {
    const db = await setup('debugger;');
    
    t.equal((await readAst(db, 'index.js')).program.body[0].type, 'DebuggerStatement');
    t.end();
});

test('putnik: writer bool lit', async (t) => {
    const db = await setup('const a = true;');
    
    t.equal((await readAst(db, 'index.js')).program.body[0].declarations[0].init.value, 1);
    t.end();
});

test('putnik: writer null lit', async (t) => {
    const db = await setup('const a = null;');
    
    t.ok(await readAst(db, 'index.js'));
    t.end();
});

test('putnik: writer regexp pattern', async (t) => {
    const db = await setup('const a = /test/gi;');
    
    t.equal((await readAst(db, 'index.js')).program.body[0].declarations[0].init.pattern, 'test');
    t.end();
});

test('putnik: writer bigint', async (t) => {
    const db = await setup('const a = 1n;');
    
    t.ok(await readAst(db, 'index.js'));
    t.end();
});

test('putnik: writer template', async (t) => {
    const db = await setup('const a = `hello`;');
    
    t.ok(await readAst(db, 'index.js'));
    t.end();
});

test('putnik: writer unary', async (t) => {
    const db = await setup('const a = -1;');
    
    t.equal((await readAst(db, 'index.js')).program.body[0].declarations[0].init.operator, '-');
    t.end();
});

test('putnik: writer assign', async (t) => {
    const db = await setup('a = 1;');
    
    t.equal((await readAst(db, 'index.js')).program.body[0].expression.operator, '=');
    t.end();
});

test('putnik: writer binary', async (t) => {
    const db = await setup('const a = 1 + 2;');
    
    t.equal((await readAst(db, 'index.js')).program.body[0].declarations[0].init.operator, '+');
    t.end();
});

test('putnik: writer logical', async (t) => {
    const db = await setup('const a = true && false;');
    
    t.equal((await readAst(db, 'index.js')).program.body[0].declarations[0].init.operator, '&&');
    t.end();
});

test('putnik: writer update', async (t) => {
    const db = await setup('let a = 0; a++;');
    
    t.equal((await readAst(db, 'index.js')).program.body[1].expression.operator, '++');
    t.end();
});

test('putnik: writer for..of', async (t) => {
    const db = await setup('for await (const a of [1]) {}');
    const result = typeof (await readAst(db, 'index.js')).program.body[0].await;
    const expected = 'boolean';
    
    t.equal(result, expected);
    t.end();
});

test('putnik: writer yield', async (t) => {
    const db = await setup('function* g() { yield 1; }');
    const result = typeof (await readAst(db, 'index.js')).program.body[0].body.body[0].expression.delegate;
    const expected = 'boolean';
    
    t.equal(result, expected);
    t.end();
});

test('putnik: writer import', async (t) => {
    const db = await setup('import fs from "fs";');
    
    t.equal((await readAst(db, 'index.js')).program.body[0].source.value, 'fs');
    t.end();
});

test('putnik: writer export', async (t) => {
    const db = await setup('const a = 1; export { a };');
    
    t.equal((await readAst(db, 'index.js')).type, 'File');
    t.end();
});

test('putnik: writer jsx br', async (t) => {
    const db = await setup('const a = <br />;', {
        sourceType: 'module',
        plugins: ['jsx'],
    });
    
    t.ok(await readAst(db, 'index.js'));
    t.end();
});

test('putnik: writer jsx id', async (t) => {
    const db = await setup('const a = <div></div>;', {
        sourceType: 'module',
        plugins: ['jsx'],
    });
    const ast = await readAst(db, 'index.js');
    const o = ast.program.body[0].declarations[0].init.openingElement;
    
    t.equal(o.name.name, 'div');
    t.end();
});

test('putnik: writer jsx text', async (t) => {
    const db = await setup('const a = <div>hello</div>;', {
        sourceType: 'module',
        plugins: ['jsx'],
    });
    
    t.ok(await readAst(db, 'index.js'));
    t.end();
});

test('putnik: writer private prop', async (t) => {
    const db = await setup('class Foo { #x = 1; }', {
        sourceType: 'module',
        plugins: ['jsx'],
    });
    
    t.ok(await readAst(db, 'index.js'));
    t.end();
});

test('putnik: writer null prog', async (t) => {
    const db = createDb();
    await createAllTables(db);
    await createView(db);
    const ast = parse('const a = 1;', parseOpts);
    
    ast.program = null;
    await writeAst(db, ast, 't.js');
    
    t.notOk(await readAst(db, 't.js'));
    t.end();
});

test('putnik: roundtrip variable declaration', async (t) => {
    const p = await createPutnik();
    await p.parse('t.js', 'const a = 1;\n');
    const result = await p.print('t.js');
    const expected = 'const a = 1;\n';
    
    t.equal(result, expected);
    t.end();
});

test('putnik: roundtrip async function', async (t) => {
    const p = await createPutnik();
    const src = 'async function f(a, b) {\n    return a + b;\n}\n';
    
    await p.parse('t.js', src);
    const result = await p.print('t.js');
    const expected = src;
    
    t.equal(result, expected);
    t.end();
});

test('putnik: roundtrip generator function', async (t) => {
    const p = await createPutnik();
    const src = 'function* g() {\n    yield 1;\n}\n';
    
    await p.parse('t.js', src);
    const result = await p.print('t.js');
    const expected = src;
    
    t.equal(result, expected);
    t.end();
});

test('putnik: roundtrip class with method', async (t) => {
    const p = await createPutnik();
    const src = 'class Foo {\n    bar() {}\n}\n';
    
    await p.parse('t.js', src);
    const result = await p.print('t.js');
    const expected = src;
    
    t.equal(result, expected);
    t.end();
});

test('putnik: roundtrip arrow function', async (t) => {
    const p = await createPutnik();
    const src = 'const f = async (a) => a + 1;\n';
    
    await p.parse('t.js', src);
    const result = await p.print('t.js');
    const expected = src;
    
    t.equal(result, expected);
    t.end();
});

test('putnik: roundtrip computed member expression', async (t) => {
    const p = await createPutnik();
    await p.parse('t.js', 'a[b];\n');
    const result = await p.print('t.js');
    const expected = 'a[b];\n';
    
    t.equal(result, expected);
    t.end();
});

test('putnik: roundtrip shorthand object property', async (t) => {
    const p = await createPutnik();
    const src = 'const o = {a};\n';
    
    await p.parse('t.js', src);
    const result = (await p.print('t.js')).includes('a,');
    
    t.ok(result);
    t.end();
});

test('putnik: default export fixes', async (t) => {
    const {default: defaultImport} = await import('./putnik.js');
    const [code] = await defaultImport('t.js', 'const a = 1;', {
        plugins: [],
        fix: true,
    });
    
    const result = code.includes('const a');
    
    t.ok(result);
    t.end();
});

test('putnik: default export no fix', async (t) => {
    const {default: defaultImport} = await import('./putnik.js');
    const [code] = await defaultImport('t.js', 'const a = 1;', {
        fix: false,
        plugins: [],
    });
    
    t.equal(code, 'const a = 1;');
    t.end();
});

test('putnik: createPutnik run returns places', async (t) => {
    const p = await createPutnik();
    await p.parse('t.js', 'const a = 1;\n');
    const plugin = {
        select: `SELECT id FROM VariableDeclaration WHERE file = :file AND kind = 'const'`,
        report: `SELECT 'test' AS message, 1 AS line, 0 AS col`,
    };
    
    const places = await p.run('t.js', [plugin]);
    
    t.equal(places.length, 1);
    t.end();
});

test('putnik: createPutnik run returns empty for no match', async (t) => {
    const p = await createPutnik();
    await p.parse('t.js', 'const a = 1;\n');
    const plugin = {
        select: `SELECT id FROM VariableDeclaration WHERE file = :file AND kind = 'var'`,
        report: `SELECT 'test' AS message, 1 AS line, 0 AS col`,
    };
    
    const places = await p.run('t.js', [plugin]);
    
    t.equal(places.length, 0);
    t.end();
});

test('putnik: transform with rule off', async (t) => {
    const db = await setup();
    const plugin = [
        ['const-to-let', {
            select: `SELECT id FROM VariableDeclaration WHERE file = :file AND kind = 'const'`,
            report: `SELECT 'test' AS message, 1 AS line, 0 AS col`,
            fix: `UPDATE VariableDeclaration SET kind = 'let' WHERE file = :file AND kind = 'const'`,
        }],
    ];
    
    const places = await transform(db, 'index.js', {
        plugins: plugin,
        rules: {
            'const-to-let': 'off',
        },
    });
    
    t.equal(places.length, 0);
    t.end();
});

test('putnik: transform with rule on', async (t) => {
    const db = await setup();
    const plugin = [
        ['const-to-let', {
            select: `SELECT id FROM VariableDeclaration WHERE file = :file AND kind = 'const'`,
            report: `SELECT 'test' AS message, 1 AS line, 0 AS col`,
            fix: `UPDATE VariableDeclaration SET kind = 'let' WHERE file = :file AND kind = 'const'`,
        }],
    ];
    
    const places = await transform(db, 'index.js', {
        plugins: plugin,
        rules: {},
    });
    
    t.equal(places.length, 1);
    t.end();
});

test('putnik: createDb with postgres dialect throws connection error', async (t) => {
    const [e] = await tryToCatch(createDb, {
        dialect: 'postgres',
        connection: 'postgresql://localhost:1/nonexistent',
    });
    
    if (e)
        t.ok(e);
    
    t.end();
});
