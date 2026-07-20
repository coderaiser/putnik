import test from 'supertape';
import {parse} from '@babel/parser';
import {
    createDb,
    createAllTables,
    createView,
    writeAst,
    readAst,
    runPlugin,
    sql,
    StringLiteral,
    NumericLiteral,
    Identifier,
    createIndexForField,
    createPutnik,
    createNode,
    applyPlan,
} from './putnik.js';

// putnik.js coverage
test('putnik: sql tag interpolates values', (t) => {
    const name = 'VariableDeclaration';
    const query = sql`SELECT * FROM "${name}" WHERE file = :file`;
    t.equal(query, 'SELECT * FROM "VariableDeclaration" WHERE file = :file');
    t.end();
});

test('putnik: sql tag with no values', (t) => {
    const query = sql`SELECT 1`;
    t.equal(query, 'SELECT 1');
    t.end();
});

// StringLiteral factory - 2 assertions, SPLIT into 2 tests
test('putnik: StringLiteral factory type', (t) => {
    const result = StringLiteral('hello');
    t.equal(result.__type, 'StringLiteral');
    t.end();
});
test('putnik: StringLiteral factory value', (t) => {
    const result = StringLiteral('hello');
    t.equal(result.value, 'hello');
    t.end();
});

// NumericLiteral factory - SPLIT
test('putnik: NumericLiteral factory type', (t) => {
    const result = NumericLiteral(42);
    t.equal(result.__type, 'NumericLiteral');
    t.end();
});
test('putnik: NumericLiteral factory value', (t) => {
    const result = NumericLiteral(42);
    t.equal(result.value, 42);
    t.end();
});

// Identifier factory - SPLIT
test('putnik: Identifier factory type', (t) => {
    const result = Identifier('foo');
    t.equal(result.__type, 'Identifier');
    t.end();
});
test('putnik: Identifier factory name', (t) => {
    const result = Identifier('foo');
    t.equal(result.name, 'foo');
    t.end();
});

test('putnik: createIndexForField', (t) => {
    const db = createDb();
    createAllTables(db);
    createIndexForField(db, 'VariableDeclaration', 'kind');
    const row = db.get(`SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_VariableDeclaration_kind'`);
    t.equal(row.name, 'idx_VariableDeclaration_kind');
    t.end();
});

function setup() {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = 1;', { sourceType: 'module' }), 'index.js');
    return db;
}

// Round-trip tests - already single assertion each
test('round-trip: const a = 1: kind', (t) => {
    const db = setup();
    const result = readAst(db, 'index.js');
    t.equal(result.program.body[0].kind, 'const');
    t.end();
});

test('round-trip: const a = 1: name', (t) => {
    const db = setup();
    const result = readAst(db, 'index.js');
    t.equal(result.program.body[0].declarations[0].id.name, 'a');
    t.end();
});

test('round-trip: const a = 1: value', (t) => {
    const db = setup();
    const result = readAst(db, 'index.js');
    t.equal(result.program.body[0].declarations[0].init.value, 1);
    t.end();
});

// Plugin select mode tests - already single assertion each
test('plugin: select mode reports places', (t) => {
    const db = setup();
    const plugin = { message: 'Prefer let over const', include: () => ['VariableDeclaration'], fix(node) { node.kind = 'let'; } };
    const places = runPlugin(db, plugin, 'index.js');
    t.equal(places.length, 1);
    t.end();
});

test('plugin: select mode returns message', (t) => {
    const db = setup();
    const plugin = { message: 'Prefer let over const', include: () => ['VariableDeclaration'], fix(node) { node.kind = 'let'; } };
    const places = runPlugin(db, plugin, 'index.js');
    t.equal(places[0].message, 'Prefer let over const');
    t.end();
});

test('plugin: select mode returns position', (t) => {
    const db = setup();
    const plugin = { message: 'Prefer let over const', include: () => ['VariableDeclaration'], fix(node) { node.kind = 'let'; } };
    const places = runPlugin(db, plugin, 'index.js');
    t.equal(places[0].position.line, 1);
    t.end();
});

test('plugin: select mode does not mutate db', (t) => {
    const db = setup();
    const plugin = { message: 'Prefer let over const', include: () => ['VariableDeclaration'], fix(node) { node.kind = 'let'; } };
    runPlugin(db, plugin, 'index.js');
    const row = db.get(`SELECT kind FROM VariableDeclaration WHERE file = ?`, ['index.js']);
    t.equal(row.kind, 'const');
    t.end();
});

test('plugin: fix mode mutates db', (t) => {
    const db = setup();
    const plugin = { message: 'Prefer let over const', include: () => ['VariableDeclaration'], fix(node) { node.kind = 'let'; } };
    runPlugin(db, plugin, 'index.js', { fix: true });
    const row = db.get(`SELECT kind FROM VariableDeclaration WHERE file = ?`, ['index.js']);
    t.equal(row.kind, 'let');
    t.end();
});

// createPutnik tests
test('putnik: createPutnik parse and getAst', (t) => {
    const putnik = createPutnik();
    putnik.parse('test.js', 'const a = 1;');
    const ast = putnik.getAst('test.js');
    t.equal(ast.program.body[0].kind, 'const');
    t.end();
});

test('putnik: createPutnik print', (t) => {
    const putnik = createPutnik();
    putnik.parse('test.js', 'const a = 1;');
    const code = putnik.print('test.js');
    t.ok(code.includes('const a = 1'));
    t.end();
});

test('putnik: createPutnik print with no ast returns empty', (t) => {
    const putnik = createPutnik();
    const code = putnik.print('nonexistent.js');
    t.equal(code, '');
    t.end();
});

test('putnik: createPutnik run', (t) => {
    const putnik = createPutnik();
    putnik.parse('test.js', 'const a = 1;');
    const plugin = { message: 'Prefer let over const', include: () => ['VariableDeclaration'], fix(node) { node.kind = 'let'; } };
    const places = putnik.run('test.js', [plugin]);
    t.equal(places.length, 1);
    t.end();
});

test('putnik: createPutnik run with fix', (t) => {
    const putnik = createPutnik();
    putnik.parse('test.js', 'const a = 1;');
    const plugin = { message: 'Prefer let over const', include: () => ['VariableDeclaration'], fix(node) { node.kind = 'let'; } };
    putnik.run('test.js', [plugin], { fix: true });
    const ast = putnik.getAst('test.js');
    t.equal(ast.program.body[0].kind, 'let');
    t.end();
});

test('putnik: createPutnik db is exposed', (t) => {
    const putnik = createPutnik();
    t.ok(putnik.db);
    t.end();
});

// reader.js edge cases
test('reader: readAst returns null for unknown file', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    const result = readAst(db, 'unknown.js');
    t.equal(result, null);
    t.end();
});

// For string literal round-trip via variable declaration (avoids ExpressionStatement not in NODE_COLUMNS)
test('reader: string literal in variable declaration round-trip', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = "hello";', { sourceType: 'module' }), 'str.js');
    const result = readAst(db, 'str.js');
    t.equal(result.program.body[0].declarations[0].init.value, 'hello');
    t.end();
});

// For testing Program source_type, the default is 'module'
// We need to test when source_type is set

// runner.js edge cases: select-based plugin
test('runner: plugin select sql without fix', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = 1;', { sourceType: 'module' }), 'index.js');
    const plugin = { message: 'All const vars', select: sql`SELECT id, file, start_line, start_col FROM "VariableDeclaration" WHERE file = :file` };
    const places = runPlugin(db, plugin, 'index.js');
    t.equal(places.length, 1);
    t.end();
});

test('runner: plugin select sql with fix', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = 1;', { sourceType: 'module' }), 'index.js');
    const plugin = {
        message: 'All const vars',
        select: sql`SELECT id, file, start_line, start_col, 'VariableDeclaration' AS type FROM "VariableDeclaration" WHERE file = :file`,
        fix(node) { node.kind = 'let'; },
    };
    runPlugin(db, plugin, 'index.js', { fix: true });
    const row = db.get(`SELECT kind FROM VariableDeclaration WHERE file = ?`, ['index.js']);
    t.equal(row.kind, 'let');
    t.end();
});

test('runner: plugin include with no fix only selects', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = 1;', { sourceType: 'module' }), 'index.js');
    const plugin = { message: 'Just checking', include: () => ['VariableDeclaration'] };
    const places = runPlugin(db, plugin, 'index.js');
    t.equal(places.length, 1);
    t.end();
});

// createNode proxy: replace op - SPLIT into individual tests
test('runner: proxy replace captures plan length', (t) => {
    const row = { id: 1, type: 'VariableDeclaration', file: 'index.js', kind: 'const' };
    const plan = [];
    const node = createNode(row, plan);
    node.init = NumericLiteral(42);
    t.equal(plan.length, 1);
    t.end();
});

test('runner: proxy replace op is replace', (t) => {
    const row = { id: 1, type: 'VariableDeclaration', file: 'index.js', kind: 'const' };
    const plan = [];
    const node = createNode(row, plan);
    node.init = NumericLiteral(42);
    t.equal(plan[0].op, 'replace');
    t.end();
});

test('runner: proxy replace captures parentId', (t) => {
    const row = { id: 1, type: 'VariableDeclaration', file: 'index.js', kind: 'const' };
    const plan = [];
    const node = createNode(row, plan);
    node.init = NumericLiteral(42);
    t.equal(plan[0].parentId, 1);
    t.end();
});

test('runner: proxy replace captures parentField', (t) => {
    const row = { id: 1, type: 'VariableDeclaration', file: 'index.js', kind: 'const' };
    const plan = [];
    const node = createNode(row, plan);
    node.init = NumericLiteral(42);
    t.equal(plan[0].parentField, 'init');
    t.end();
});

test('runner: proxy replace captures newNode', (t) => {
    const row = { id: 1, type: 'VariableDeclaration', file: 'index.js', kind: 'const' };
    const plan = [];
    const node = createNode(row, plan);
    node.init = NumericLiteral(42);
    t.equal(plan[0].newNode.value, 42);
    t.end();
});

// applyPlan: replace op - SPLIT
test('runner: applyPlan replace deletes old type', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = 1;', { sourceType: 'module' }), 'index.js');
    const row = db.get(`SELECT id FROM VariableDeclarator WHERE file = ?`, ['index.js']);
    applyPlan(db, [{ op: 'replace', parentId: row.id, parentField: 'init', newNode: { __type: 'StringLiteral', value: 'hello' }, file: 'index.js' }]);
    const oldRows = db.all(`SELECT * FROM NumericLiteral WHERE file = ?`, ['index.js']);
    t.equal(oldRows.length, 0);
    t.end();
});

test('runner: applyPlan replace inserts new type', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = 1;', { sourceType: 'module' }), 'index.js');
    const row = db.get(`SELECT id FROM VariableDeclarator WHERE file = ?`, ['index.js']);
    applyPlan(db, [{ op: 'replace', parentId: row.id, parentField: 'init', newNode: { __type: 'StringLiteral', value: 'hello' }, file: 'index.js' }]);
    const newRows = db.all(`SELECT * FROM StringLiteral WHERE file = ?`, ['index.js']);
    t.equal(newRows.length, 1);
    t.end();
});

test('runner: applyPlan replace has correct value', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = 1;', { sourceType: 'module' }), 'index.js');
    const row = db.get(`SELECT id FROM VariableDeclarator WHERE file = ?`, ['index.js']);
    applyPlan(db, [{ op: 'replace', parentId: row.id, parentField: 'init', newNode: { __type: 'StringLiteral', value: 'hello' }, file: 'index.js' }]);
    const newRows = db.all(`SELECT * FROM StringLiteral WHERE file = ?`, ['index.js']);
    t.equal(newRows[0].value, 'hello');
    t.end();
});

// writer.js: null node
test('writer: writeAst null node returns null read', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    const ast = parse('const a = 1;', { sourceType: 'module' });
    ast.program = null;
    writeAst(db, ast, 'index.js');
    const result = readAst(db, 'index.js');
    t.equal(result, null);
    t.end();
});
