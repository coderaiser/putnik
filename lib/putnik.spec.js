import {test} from 'supertape';
import {tryToCatch} from 'try-to-catch';
import putout from 'putout';
import {createDb} from './db/sqlite.js';
import putnik, {
    parse,
    print,
    createAllTables,
    createView,
    createTable,
    createIndexForField,
    writeAst,
    readAst,
    transform,
    sql,
} from './putnik.js';

test('putnik: sql interpolates', (t) => {
    const result = sql`SELECT id FROM X WHERE kind = const`;
    const expected = 'SELECT id FROM X WHERE kind = const';
    
    t.equal(result, expected);
    t.end();
});

test('putnik: sql interpolates value', (t) => {
    const kind = 'const';
    const result = sql`SELECT id FROM X WHERE kind = ${kind}`;
    
    t.equal(result, 'SELECT id FROM X WHERE kind = const');
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
    const [error] = await tryToCatch(print, 'x.js');
    
    t.equal(error.message, `☝️Looks like 'db' is missing`);
    t.end();
});

test('putnik: createPutnik getAst', async (t) => {
    const db = await parse('t.js', 'const a = 1;');
    const ast = await readAst(db, 't.js');
    const {kind} = ast.program.body[0];
    
    t.equal(kind, 'const');
    t.end();
});

test('putnik: createPutnik print', async (t) => {
    const db = await parse('t.js', 'const a = 1;');
    const result = await print('t.js', db);
    const expected = 'const a = 1;\n';
    
    t.equal(result, expected);
    t.end();
});

test('putnik: createPutnik db', async (t) => {
    const db = await parse('t.js', 'const a = 1;');
    
    t.ok(db);
    t.end();
});

test('putnik: transform empty', async (t) => {
    const db = await parse('index.js', 'const a = 1');
    const {length} = await transform('index.js', db);
    
    t.notOk(length, 0);
    t.end();
});

test('putnik: readAst srcType default', async (t) => {
    const db = await parse('index.js', 'const a = 1');
    
    db.run('UPDATE Program SET source_type = NULL WHERE file = :file', {
        file: 'index.js',
    });
    
    t.equal((await readAst(db, 'index.js')).program.sourceType, 'module');
    t.end();
});

test('putnik: readAst null no rows', async (t) => {
    const db = await parse('index.js', 'const a = 1');
    const ast = await readAst(db, 'x.js');
    
    t.notOk(ast);
    t.end();
});

test('putnik: readAst null del root', async (t) => {
    const db = await parse('index.js', 'const a = 1');
    db.run('DELETE FROM Program WHERE file = ?', ['index.js']);
    
    t.notOk(await readAst(db, 'index.js'));
    t.end();
});

test('putnik: readAst debugger', async (t) => {
    const db = await parse('index.js', 'debugger;');
    const ast = await readAst(db, 'index.js');
    const {type} = ast.program.body[0];
    
    t.equal(type, 'DebuggerStatement');
    t.end();
});

test('putnik: writer bool lit', async (t) => {
    const db = await parse('index.js', 'const a = true;');
    const ast = await readAst(db, 'index.js');
    const {value} = ast.program.body[0].declarations[0].init;
    
    t.equal(value, 1);
    t.end();
});

test('putnik: writer null lit', async (t) => {
    const db = await parse('index.js', 'const a = null;');
    const ast = await readAst(db, 'index.js');
    
    t.ok(ast);
    t.end();
});

test('putnik: writer regexp pattern', async (t) => {
    const db = await parse('index.js', 'const a = /test/gi;');
    const ast = await readAst(db, 'index.js');
    const {pattern} = ast.program.body[0].declarations[0].init;
    
    t.equal(pattern, 'test');
    t.end();
});

test('putnik: writer bigint', async (t) => {
    const db = await parse('index.js', 'const a = 1n;');
    const ast = await readAst(db, 'index.js');
    
    t.ok(ast);
    t.end();
});

test('putnik: writer template', async (t) => {
    const db = await parse('index.js', 'const a = `hello`;');
    const ast = await readAst(db, 'index.js');
    
    t.ok(ast);
    t.end();
});

test('putnik: writer unary', async (t) => {
    const db = await parse('index.js', 'const a = -1;');
    const ast = await readAst(db, 'index.js');
    const {operator} = ast.program.body[0].declarations[0].init;
    
    t.equal(operator, '-');
    t.end();
});

test('putnik: writer assign', async (t) => {
    const db = await parse('index.js', 'a = 1;');
    const ast = await readAst(db, 'index.js');
    
    const {operator} = ast.program.body[0].expression;
    
    t.equal(operator, '=');
    t.end();
});

test('putnik: writer binary', async (t) => {
    const db = await parse('index.js', 'const a = 1 + 2;');
    const ast = await readAst(db, 'index.js');
    const {operator} = ast.program.body[0].declarations[0].init;
    
    t.equal(operator, '+');
    t.end();
});

test('putnik: writer logical', async (t) => {
    const db = await parse('index.js', 'const a = true && false;');
    const ast = await readAst(db, 'index.js');
    const {operator} = ast.program.body[0].declarations[0].init;
    
    t.equal(operator, '&&');
    t.end();
});

test('putnik: writer update', async (t) => {
    const db = await parse('index.js', 'let a = 0; a++;');
    const ast = await readAst(db, 'index.js');
    const {operator} = ast.program.body[1].expression;
    
    t.equal(operator, '++');
    t.end();
});

test('putnik: writer for..of', async (t) => {
    const db = await parse('index.js', 'for await (const a of [1]) {}');
    const result = typeof (await readAst(db, 'index.js')).program.body[0].await;
    const expected = 'boolean';
    
    t.equal(result, expected);
    t.end();
});

test('putnik: writer yield', async (t) => {
    const db = await parse('index.js', 'function* g() { yield 1; }');
    const result = typeof (await readAst(db, 'index.js')).program.body[0].body.body[0].expression.delegate;
    const expected = 'boolean';
    
    t.equal(result, expected);
    t.end();
});

const setup = async (a = 'const a = 1;') => {
    return await parse('index.js', a);
};

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
    const db = await setup('const a = <br />;');
    
    t.ok(await readAst(db, 'index.js'));
    t.end();
});

test('putnik: writer jsx id', async (t) => {
    const db = await setup('const a = <div></div>;');
    
    const ast = await readAst(db, 'index.js');
    const o = ast.program.body[0].declarations[0].init.openingElement;
    
    t.equal(o.name.name, 'div');
    t.end();
});

test('putnik: writer jsx text', async (t) => {
    const db = await setup('const a = <div>hello</div>;');
    
    t.ok(await readAst(db, 'index.js'));
    t.end();
});

test('putnik: writer private prop', async (t) => {
    const db = await setup('class Foo { #x = 1; }');
    
    t.ok(await readAst(db, 'index.js'));
    t.end();
});

test('putnik: writer null prog', async (t) => {
    const db = createDb();
    await createAllTables(db);
    await createView(db);
    const ast = putout.parse('const a = 1;');
    
    ast.program = null;
    await writeAst(db, ast, 't.js');
    
    t.notOk(await readAst(db, 't.js'));
    t.end();
});

test('putnik: roundtrip variable declaration', async (t) => {
    const db = await parse('t.js', 'const a = 1;\n');
    const result = await print('t.js', db);
    const expected = 'const a = 1;\n';
    
    t.equal(result, expected);
    t.end();
});

test('putnik: roundtrip async function', async (t) => {
    const source = 'async function f(a, b) {\n    return a + b;\n}\n';
    
    const db = await parse('t.js', source);
    const result = await print('t.js', db);
    
    t.equal(result, source);
    t.end();
});

test('putnik: roundtrip generator function', async (t) => {
    const source = 'function* g() {\n    yield 1;\n}\n';
    
    const db = await parse('t.js', source);
    const result = await print('t.js', db);
    
    t.equal(result, source);
    t.end();
});

test('putnik: roundtrip class with method', async (t) => {
    const source = 'class Foo {\n    bar() {}\n}\n';
    
    const db = await parse('t.js', source);
    const result = await print('t.js', db);
    
    t.equal(result, source);
    t.end();
});

test('putnik: roundtrip arrow function', async (t) => {
    const source = 'const f = async (a) => a + 1;\n';
    
    const db = await parse('t.js', source);
    const result = await print('t.js', db);
    
    t.equal(result, source);
    t.end();
});

test('putnik: roundtrip computed member expression', async (t) => {
    const db = await parse('t.js', 'a[b];\n');
    const result = await print('t.js', db);
    const expected = 'a[b];\n';
    
    t.equal(result, expected);
    t.end();
});

test('putnik: roundtrip shorthand object property', async (t) => {
    const src = 'const o = {a};\n';
    const db = await parse('t.js', src);
    const result = await print('t.js', db);
    
    t.match(result, 'a,');
    t.end();
});

test('putnik: default export fixes', async (t) => {
    const {default: putnik} = await import('./putnik.js');
    const [code] = await putnik('t.js', 'const a = 1;', {
        fix: true,
    });
    
    const result = code.includes('const a');
    
    t.ok(result);
    t.end();
});

test('putnik: dialect: postgres', async (t) => {
    const [error] = await tryToCatch(putnik, 't.js', 'const a = 1;', {
        fix: true,
        database: {
            dialect: 'postgres',
        },
    });
    
    t.ok(error);
    t.end();
});

test('putnik: dialect: sqlite', async (t) => {
    const [error] = await tryToCatch(putnik, 't.js', 'const a = 1;', {
        fix: true,
        database: {
            dialect: 'sqlite',
        },
    });
    
    t.notOk(error);
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
    const db = await parse('t.js', 'const a = 1;\n');
    const plugin = {
        select: `SELECT id FROM VariableDeclaration WHERE file = :file AND kind = 'const'`,
        report: `SELECT 'test' AS message, 1 AS line, 0 AS col`,
    };
    
    const places = await transform('t.js', db, {
        fix: false,
        plugins: [
            ['remove', plugin],
        ],
    });
    
    t.equal(places.length, 1);
    t.end();
});

test('putnik: createPutnik run returns empty for no match', async (t) => {
    const plugin = {
        select: `SELECT id FROM VariableDeclaration WHERE file = :file AND kind = 'var'`,
        report: `SELECT 'test' AS message, 1 AS line, 0 AS col`,
    };
    
    const db = await parse('t.js', 'const a = 1;\n');
    
    const places = await transform('t.js', db, {
        plugins: [
            ['plugin', plugin],
        ],
    });
    
    t.equal(places.length, 0);
    t.end();
});

test('putnik: transform with rule off', async (t) => {
    const db = await setup();
    const plugins = [
        ['const-to-let', {
            select: `SELECT id FROM VariableDeclaration WHERE file = :file AND kind = 'const'`,
            report: `SELECT 'test' AS message, 1 AS line, 0 AS col`,
            fix: `UPDATE VariableDeclaration SET kind = 'let' WHERE file = :file AND kind = 'const'`,
        }],
    ];
    
    const places = await transform('index.js', db, {
        plugins,
        rules: {
            'const-to-let': 'off',
        },
    });
    
    t.equal(places.length, 0);
    t.end();
});

test('putnik: transform with rule on', async (t) => {
    const db = await setup();
    const plugins = [
        ['const-to-let', {
            select: `SELECT id FROM VariableDeclaration WHERE file = :file AND kind = 'const'`,
            report: `SELECT 'test' AS message, 1 AS line, 0 AS col`,
            fix: `UPDATE VariableDeclaration SET kind = 'let' WHERE file = :file AND kind = 'const'`,
        }],
    ];
    
    const places = await transform('index.js', db, {
        plugins,
        rules: {},
    });
    
    t.equal(places.length, 1);
    t.end();
});

test('putnik: createDb with postgres dialect throws connection error', async (t) => {
    const [error] = await tryToCatch(createDb, {
        dialect: 'postgres',
        connection: 'postgresql://localhost:1/nonexistent',
    });
    
    t.equal(error.message, 'failed to downcast any to string');
    t.end();
});
