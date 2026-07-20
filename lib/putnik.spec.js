import test from 'supertape';
import {parse} from '@putout/babel';
import {
    createDb,
    createAllTables,
    createView,
    writeAst,
    readAst,
    createIndexForField,
    createPutnik,
} from './putnik.js';

function setup() {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = 1;', {
        sourceType: 'module',
    }), 'index.js');
    
    return db;
}

const constPlugin = {
    select: `SELECT id FROM VariableDeclaration WHERE file = :file AND kind = 'const'`,
    report: `SELECT 'Prefer let over const' AS message, start_line AS line, start_col AS col FROM VariableDeclaration WHERE file = :file AND kind = 'const'`,
    fix: `UPDATE VariableDeclaration SET kind = 'let' WHERE file = :file AND kind = 'const'`,
};

test('putnik: createIndexForField creates index', (t) => {
    const db = createDb();
    createAllTables(db);
    createIndexForField(db, 'VariableDeclaration', 'kind');
    const row = db.get(`SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_VariableDeclaration_kind'`);
    
    t.equal(row.name, 'idx_VariableDeclaration_kind');
    t.end();
});

test('round-trip: const a = 1: kind', (t) => {
    t.equal(readAst(setup(), 'index.js').program.body[0].kind, 'const');
    t.end();
});

test('round-trip: const a = 1: name', (t) => {
    t.equal(readAst(setup(), 'index.js').program.body[0].declarations[0].id.name, 'a');
    t.end();
});

test('round-trip: const a = 1: value', (t) => {
    t.equal(readAst(setup(), 'index.js').program.body[0].declarations[0].init.value, 1);
    t.end();
});

test('reader: readAst returns null for unknown file', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    
    const result = readAst(db, 'unknown.js');
    
    t.notOk(result);
    t.end();
});

test('reader: string literal round-trip', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = "hello";', {
        sourceType: 'module',
    }), 'str.js');
    
    t.equal(readAst(db, 'str.js').program.body[0].declarations[0].init.value, 'hello');
    t.end();
});

test('writer: writeAst null node returns null read', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    const ast = parse('const a = 1;', {
        sourceType: 'module',
    });
    
    ast.program = null;
    writeAst(db, ast, 'index.js');
    
    const result = readAst(db, 'index.js');
    
    t.notOk(result);
    t.end();
});

test('putnik: createPutnik parse and getAst', (t) => {
    const putnik = createPutnik();
    putnik.parse('test.js', 'const a = 1;');
    
    t.equal(putnik.getAst('test.js').program.body[0].kind, 'const');
    t.end();
});

test('putnik: createPutnik print', (t) => {
    const putnik = createPutnik();
    putnik.parse('test.js', 'const a = 1;');
    const result = putnik
        .print('test.js')
        .includes('const a = 1');
    
    t.ok(result);
    t.end();
});

test('putnik: createPutnik print with no ast returns empty', (t) => {
    const result = createPutnik().print('nonexistent.js');
    const expected = '';
    
    t.equal(result, expected);
    t.end();
});

test('putnik: createPutnik run report mode', (t) => {
    const putnik = createPutnik();
    putnik.parse('test.js', 'const a = 1;');
    
    t.equal(putnik.run('test.js', [constPlugin]).length, 1);
    t.end();
});

test('putnik: createPutnik run fix mode', (t) => {
    const putnik = createPutnik();
    putnik.parse('test.js', 'const a = 1;');
    putnik.run('test.js', [constPlugin], {
        fix: true,
    });
    
    t.equal(putnik.getAst('test.js').program.body[0].kind, 'let');
    t.end();
});

test('putnik: createPutnik db is exposed', (t) => {
    t.ok(createPutnik().db);
    t.end();
});
