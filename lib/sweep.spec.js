import {test} from 'supertape';
import {parse} from './putnik.js';
import {sweep} from './sweep.js';

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
