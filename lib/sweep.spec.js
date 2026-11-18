import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {rm} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {test} from 'supertape';
import {
    parse,
    print,
    transform,
} from './putnik.js';
import {loadPlugin} from './sql-plugin/sql-plugin.js';
import {sweep, sweepDirty} from './sweep.js';

const pglite = {
    dialect: 'pglite',
};

const getFile = ({file}) => file;

const getMarked = async (db) => {
    const rows = await db.all('SELECT file FROM SweepFile ORDER BY file');
    
    return rows.map(getFile);
};

const count = async (db, table) => {
    const [{n}] = await db.all(`SELECT count(*) AS n FROM ${table}`);
    
    return n;
};

test('putnik: sweep: orphan node', async (t) => {
    const db = await parse('a.js', 'a(b);\n');
    
    await db.run('DELETE FROM ExpressionStatement');
    await sweep(db, ['a.js']);
    
    const result = await count(db, 'CallExpression');
    
    db.end();
    
    t.equal(result, 0);
    t.end();
});

test('putnik: sweep: nested orphans', async (t) => {
    const db = await parse('a.js', 'a.b.c(d);\n');
    
    await db.run('DELETE FROM ExpressionStatement');
    await sweep(db, ['a.js']);
    
    const result = await count(db, 'MemberExpression') + await count(db, 'Identifier');
    
    db.end();
    
    t.equal(result, 0);
    t.end();
});

test('putnik: sweep: live node', async (t) => {
    const db = await parse('a.js', 'a(b);\nc(d);\n');
    
    await db.run('DELETE FROM ExpressionStatement WHERE id = 1');
    await sweep(db, ['a.js']);
    
    const result = await count(db, 'CallExpression');
    
    db.end();
    
    t.equal(result, 1);
    t.end();
});

test('putnik: sweep: other file', async (t) => {
    const db = await parse(['a.js', 'b.js'], ['a(b);\n', 'c(d);\n']);
    
    await db.run('DELETE FROM ExpressionStatement');
    await sweep(db, ['a.js']);
    
    const result = await count(db, 'CallExpression');
    
    db.end();
    
    t.equal(result, 1);
    t.end();
});

test('putnik: sweep: unknown parent type', async (t) => {
    const db = await parse('a.js', 'a;\n');
    
    await db.run(`
        INSERT INTO Identifier (file, name, parent_id, parent_type, parent_field)
        VALUES ('a.js', 'x', 1, 'Foo''; DROP TABLE Program; --', 'body')
    `);
    
    await sweep(db, ['a.js']);
    
    const result = await count(db, 'Program');
    
    db.end();
    
    t.equal(result, 1);
    t.end();
});

test('putnik: sweep: reference of the removed node', async (t) => {
    const db = await parse('a.js', 'const a = 1;\na;\n', {
        bindings: true,
    });
    
    await db.run(`DELETE FROM ExpressionStatement`);
    await sweep(db, ['a.js']);
    
    const result = await count(db, 'Reference');
    
    db.end();
    
    t.equal(result, 0);
    t.end();
});

test('putnik: sweep: binding of the live declaration', async (t) => {
    const db = await parse('a.js', 'const a = 1;\na;\n', {
        bindings: true,
    });
    
    await db.run(`DELETE FROM ExpressionStatement`);
    await sweep(db, ['a.js']);
    
    const result = await count(db, 'Binding');
    
    db.end();
    
    t.equal(result, 1);
    t.end();
});

test('putnik: sweep: binding and reference of the removed declaration', async (t) => {
    const db = await parse('a.js', 'const a = 1;\na;\n', {
        bindings: true,
    });
    
    await db.run(`DELETE FROM VariableDeclaration`);
    await sweep(db, ['a.js']);
    
    const result = await count(db, 'Binding') + await count(db, 'Reference');
    
    db.end();
    
    t.equal(result, 0);
    t.end();
});

test('putnik: sweep: comment of the removed node', async (t) => {
    const db = await parse('a.js', '// first\na(b);\n');
    const before = await count(db, 'Comments');
    
    await db.run('DELETE FROM ExpressionStatement');
    await sweep(db, ['a.js']);
    
    const after = await count(db, 'Comments');
    
    db.end();
    
    const result = [before, after];
    const expected = [1, 0];
    
    t.deepEqual(result, expected);
    t.end();
});

test('putnik: sweep: extra of the removed node', async (t) => {
    const db = await parse('a.js', '(a)(b);\n');
    const before = await count(db, 'Extra');
    
    await db.run('DELETE FROM ExpressionStatement');
    await sweep(db, ['a.js']);
    
    const after = await count(db, 'Extra');
    
    db.end();
    
    const result = [before, after];
    const expected = [1, 0];
    
    t.deepEqual(result, expected);
    t.end();
});

test('putnik: sweep: unknown node type', async (t) => {
    const db = await parse('a.js', 'a;\n');
    
    await db.run(`
        INSERT INTO Comments (file, node_id, node_type, type, value)
        VALUES ('a.js', 1, 'Foo''; DROP TABLE Program; --', 'CommentLine', 'x')
    `);
    
    await sweep(db, ['a.js']);
    
    const result = await count(db, 'Program');
    
    db.end();
    
    t.equal(result, 1);
    t.end();
});

test('putnik: sweep: DELETE marks the file', async (t) => {
    const db = await parse(['a.js', 'b.js'], ['a(b);\n', 'c(d);\n']);
    
    await db.run(`DELETE FROM ExpressionStatement WHERE file = 'a.js'`);
    
    const result = await getMarked(db);
    
    db.end();
    
    const expected = ['a.js'];
    
    t.deepEqual(result, expected);
    t.end();
});

test('putnik: sweep: parse does not mark the file', async (t) => {
    const db = await parse('a.js', 'a(b);\n');
    const result = await getMarked(db);
    
    db.end();
    const expected = [];
    
    t.deepEqual(result, expected);
    t.end();
});

test('putnik: sweep: parse of the changed file does not mark the file', async (t) => {
    const path = join(tmpdir(), `putnik-sweep-${randomUUID()}.db`);
    const first = await parse('a.js', 'a(b);\n', {
        database: path,
    });
    
    first.end();
    
    const second = await parse('a.js', 'c(d);\n', {
        database: path,
    });
    
    const result = await getMarked(second);
    
    second.end();
    await rm(path, {
        force: true,
    });
    const expected = [];
    
    t.deepEqual(result, expected);
    t.end();
});

test('putnik: sweep: sweepDirty: orphans', async (t) => {
    const db = await parse('a.js', 'a.b(c);\n');
    
    await db.run('DELETE FROM ExpressionStatement');
    await sweepDirty(db);
    
    const result = await count(db, 'CallExpression') + await count(db, 'Identifier');
    
    db.end();
    
    t.equal(result, 0);
    t.end();
});

test('putnik: sweep: sweepDirty: clear marks', async (t) => {
    const db = await parse('a.js', 'a(b);\n');
    
    await db.run('DELETE FROM ExpressionStatement');
    await sweepDirty(db);
    
    const result = await getMarked(db);
    
    db.end();
    const expected = [];
    
    t.deepEqual(result, expected);
    t.end();
});

test('putnik: sweep: sweepDirty: nothing to do', async (t) => {
    const db = await parse('a.js', 'a(b);\n');
    
    await sweepDirty(db);
    
    const result = await count(db, 'CallExpression');
    
    db.end();
    
    t.equal(result, 1);
    t.end();
});

test('putnik: sweep: print: DELETE outside of transform', async (t) => {
    const db = await parse('a.js', 'a(b);\nc(d);\n');
    
    await db.run('DELETE FROM ExpressionStatement WHERE id = 1');
    
    const code = await print('a.js', db);
    const result = await count(db, 'CallExpression');
    
    db.end();
    
    const expected = ['c(d);\n', 1];
    
    t.deepEqual([code, result], expected);
    t.end();
});

test('putnik: sweep: transform: DELETE outside of transform', async (t) => {
    const db = await parse('a.js', 'console.log(x === NaN);\nfoo(y === NaN);\n');
    
    await db.run('DELETE FROM ExpressionStatement WHERE id = 1');
    
    const places = await transform('a.js', db, {
        plugins: [
            ['apply-is-nan', loadPlugin(new URL('plugins/apply-is-nan.sql', import.meta.url).pathname)],
        ],
        fix: false,
    });
    
    db.end();
    
    t.equal(places.length, 1);
    t.end();
});

test('putnik: sweep: INSERT OR REPLACE marks the file', async (t) => {
    const db = await parse('a.js', 'a;\n');
    const [{id}] = await db.all('SELECT id FROM Identifier');
    
    await db.run(`
        INSERT OR REPLACE INTO Identifier (id, file, name, parent_id, parent_type, parent_field)
        VALUES (${id}, 'a.js', 'b', 1, 'ExpressionStatement', 'expression')
    `);
    
    const result = await getMarked(db);
    
    db.end();
    
    const expected = ['a.js'];
    
    t.deepEqual(result, expected);
    t.end();
});

test('putnik: sweep: pglite: DELETE marks the file', async (t) => {
    const db = await parse('a.js', 'a(b);\n', {
        database: pglite,
    });
    
    await db.run('DELETE FROM ExpressionStatement');
    
    const result = await getMarked(db);
    
    await db.end();
    const expected = ['a.js'];
    
    t.deepEqual(result, expected);
    t.end();
});

test('putnik: sweep: pglite: comment and binding of the removed node', async (t) => {
    const db = await parse('a.js', '// first\nconst a = 1;\nfoo(a);\n', {
        database: pglite,
        bindings: true,
    });
    
    await db.run(`DELETE FROM ExpressionStatement`);
    await sweepDirty(db);
    
    const result = [
        await count(db, 'CallExpression'),
        await count(db, 'Reference'),
        await count(db, 'Binding'),
        await count(db, 'Comments'),
    ];
    
    await db.end();
    const expected = [
        0,
        0,
        1,
        1,
    ];
    
    t.deepEqual(result, expected);
    t.end();
});
