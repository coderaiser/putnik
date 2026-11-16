import {test} from 'supertape';
import {parse} from './putnik.js';

const parseScope = (source, name = 'a.js') => parse(name, source, {
    bindings: true,
});

test('scope: Binding: columns', async (t) => {
    const db = await parse('a.js', 'const a = 1;');
    const rows = db.all('PRAGMA table_info(Binding)');
    const result = [];
    
    for (const {name} of rows)
        result.push(name);
    
    const expected = [
        'id',
        'file',
        'name',
        'kind',
        'scope_id',
        'node_type',
        'node_id',
        'declaration_type',
        'declaration_id',
        'constant',
        'start_line',
        'start_col',
        'end_line',
        'end_col',
    ];
    
    t.deepEqual(result, expected);
    t.end();
});

test('scope: Reference: columns', async (t) => {
    const db = await parse('a.js', 'const a = 1;');
    const rows = db.all('PRAGMA table_info(Reference)');
    const result = [];
    
    for (const {name} of rows)
        result.push(name);
    
    const expected = [
        'id',
        'file',
        'binding_id',
        'node_type',
        'node_id',
        'is_write',
    ];
    
    t.deepEqual(result, expected);
    t.end();
});

test('scope: no rows without the option scope', async (t) => {
    const db = await parse('a.js', 'const a = 1;');
    const [{count}] = db.all('SELECT COUNT(*) AS count FROM Binding');
    
    t.equal(count, 0);
    t.end();
});

test('scope: kind: param', async (t) => {
    const db = await parseScope('function f(a) {}');
    const [row] = db.all(`SELECT kind FROM Binding WHERE name = 'a'`);
    
    t.equal(row.kind, 'param');
    t.end();
});

test('scope: kind: var', async (t) => {
    const db = await parseScope('var a = 1;');
    const [row] = db.all(`SELECT kind FROM Binding WHERE name = 'a'`);
    
    t.equal(row.kind, 'var');
    t.end();
});

test('scope: kind: let', async (t) => {
    const db = await parseScope('let a = 1;');
    const [row] = db.all(`SELECT kind FROM Binding WHERE name = 'a'`);
    
    t.equal(row.kind, 'let');
    t.end();
});

test('scope: kind: const', async (t) => {
    const db = await parseScope('const a = 1;');
    const [row] = db.all(`SELECT kind FROM Binding WHERE name = 'a'`);
    
    t.equal(row.kind, 'const');
    t.end();
});

test('scope: kind: module', async (t) => {
    const db = await parseScope(`import a from 'a';`);
    const [row] = db.all(`SELECT kind FROM Binding WHERE name = 'a'`);
    
    t.equal(row.kind, 'module');
    t.end();
});

test('scope: kind: function name', async (t) => {
    const db = await parseScope('function a() {}');
    const [row] = db.all(`SELECT kind FROM Binding WHERE name = 'a'`);
    
    t.equal(row.kind, 'hoisted');
    t.end();
});

test('scope: kind: class name', async (t) => {
    const db = await parseScope('class A {}');
    const [row] = db.all(`SELECT kind FROM Binding WHERE name = 'A'`);
    
    t.equal(row.kind, 'let');
    t.end();
});

test('scope: kind: catch parameter', async (t) => {
    const db = await parseScope('try {} catch (e) {}');
    const [row] = db.all(`SELECT kind FROM Binding WHERE name = 'e'`);
    
    t.equal(row.kind, 'let');
    t.end();
});

test('scope: a shadowed name has two bindings in two scopes', async (t) => {
    const db = await parseScope('const a = 1;\nfunction f() {\n    const a = 2;\n}');
    const [{count}] = db.all(`SELECT COUNT(DISTINCT scope_id) AS count FROM Binding WHERE name = 'a'`);
    
    t.equal(count, 2);
    t.end();
});

test('scope: a global name has no binding', async (t) => {
    const db = await parseScope('a;');
    const [{count}] = db.all(`SELECT COUNT(*) AS count FROM Binding`);
    
    t.equal(count, 0);
    t.end();
});

test('scope: Binding points to the Identifier row', async (t) => {
    const db = await parseScope('const a = 1;');
    const [row] = db.all(`
        SELECT i.name
        FROM Binding b
        JOIN Identifier i ON i.id = b.node_id AND b.node_type = 'Identifier'
        WHERE b.name = 'a'
    `);
    
    t.equal(row.name, 'a');
    t.end();
});

test('scope: Binding points to the declaration row', async (t) => {
    const db = await parseScope('const a = 1;');
    const [row] = db.all(`SELECT declaration_type FROM Binding WHERE name = 'a'`);
    
    t.equal(row.declaration_type, 'VariableDeclarator');
    t.end();
});

test('scope: Binding has the location of the identifier', async (t) => {
    const db = await parseScope('const a = 1;');
    const [row] = db.all(`SELECT start_line, start_col, end_line, end_col FROM Binding WHERE name = 'a'`);
    
    const expected = {
        start_line: 1,
        start_col: 6,
        end_line: 1,
        end_col: 7,
    };
    
    t.deepEqual(row, expected);
    t.end();
});

test('scope: constant is 1 for const', async (t) => {
    const db = await parseScope('const a = 1;');
    const [row] = db.all(`SELECT constant FROM Binding WHERE name = 'a'`);
    
    t.equal(row.constant, 1);
    t.end();
});

test('scope: constant is 0 for a binding that is assigned', async (t) => {
    const db = await parseScope('let a = 1;\na = 2;');
    const [row] = db.all(`SELECT constant FROM Binding WHERE name = 'a'`);
    
    t.equal(row.constant, 0);
    t.end();
});

test('scope: Reference: read', async (t) => {
    const db = await parseScope('const a = 1;\nf(a);\nf(a);');
    const [{count}] = db.all(`SELECT COUNT(*) AS count FROM Reference WHERE is_write = 0`);
    
    t.equal(count, 2);
    t.end();
});

test('scope: Reference: points to the Identifier row', async (t) => {
    const db = await parseScope('const a = 1;\nf(a);');
    const [row] = db.all(`
        SELECT i.parent_type
        FROM Reference r
        JOIN Identifier i ON i.id = r.node_id AND r.node_type = 'Identifier'
    `);
    
    t.equal(row.parent_type, 'CallExpression');
    t.end();
});

test('scope: Reference: write by assignment', async (t) => {
    const db = await parseScope('let a = 1;\na = 2;');
    const [{count}] = db.all(`SELECT COUNT(*) AS count FROM Reference WHERE is_write = 1`);
    
    t.equal(count, 1);
    t.end();
});

test('scope: Reference: write by update', async (t) => {
    const db = await parseScope('let a = 1;\na++;');
    const [{count}] = db.all(`SELECT COUNT(*) AS count FROM Reference WHERE is_write = 1`);
    
    t.equal(count, 1);
    t.end();
});

test('scope: Reference: write by for..of', async (t) => {
    const db = await parseScope('let a;\nfor (a of b);');
    const [{count}] = db.all(`SELECT COUNT(*) AS count FROM Reference WHERE is_write = 1`);
    
    t.equal(count, 1);
    t.end();
});

test('scope: Reference: write by destructuring keeps only the own name', async (t) => {
    const db = await parseScope('let a, b;\n[a, b] = c;');
    const [{count}] = db.all(`SELECT COUNT(*) AS count FROM Reference WHERE is_write = 1`);
    
    t.equal(count, 2);
    t.end();
});

test('scope: Reference: write by declarator with a repeated var', async (t) => {
    const db = await parseScope('var a = 1;\nvar a = 2;');
    const [{count}] = db.all(`SELECT COUNT(*) AS count FROM Reference WHERE is_write = 1`);
    
    t.equal(count, 1);
    t.end();
});

test('scope: more than one chunk of rows', async (t) => {
    const source = Array
        .from({length: 250}, (_, i) => `const a${i} = 1;`)
        .join('\n');
    
    const db = await parseScope(source);
    const [{count}] = db.all('SELECT COUNT(*) AS count FROM Binding');
    
    t.equal(count, 250);
    t.end();
});

test('scope: two files have different binding ids', async (t) => {
    const db = await parse(['a.js', 'b.js'], ['const a = 1;', 'const a = 2;'], {
        bindings: true,
    });
    
    const [{count}] = db.all('SELECT COUNT(DISTINCT id) AS count FROM Binding');
    
    t.equal(count, 2);
    t.end();
});

test('scope: every file keeps its own rows', async (t) => {
    const db = await parse(['a.js', 'b.js'], ['const a = 1;', 'const b = 2;'], {
        bindings: true,
    });
    
    const [row] = db.all(`SELECT file FROM Binding WHERE name = 'b'`);
    
    t.equal(row.file, 'b.js');
    t.end();
});

test('scope: a function declaration of a var name has no write reference', async (t) => {
    const db = await parseScope('function f() {\n    var a;\n    function a() {}\n}');
    const [{count}] = db.all(`SELECT COUNT(*) AS count FROM Reference WHERE is_write = 1`);
    
    t.equal(count, 0);
    t.end();
});
