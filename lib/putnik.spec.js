import test from 'supertape';
import {parse} from '@putout/babel';
import putnik, {
    createDb,
    createAllTables,
    createView,
    writeAst,
    readAst,
    createIndexForField,
    createPutnik,
    sql,
    parseAndWriteToDb,
    transform,
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

test('putnik: createPutnik run report mode', async (t) => {
    const putnik = createPutnik();
    putnik.parse('test.js', 'const a = 1;');
    
    t.equal((await putnik.run('test.js', [constPlugin])).length, 1);
    t.end();
});

test('putnik: createPutnik run fix mode', async (t) => {
    const putnik = createPutnik();
    putnik.parse('test.js', 'const a = 1;');
    await putnik.run('test.js', [constPlugin], {
        fix: true,
    });
    
    t.equal(putnik.getAst('test.js').program.body[0].kind, 'let');
    t.end();
});

test('putnik: createPutnik db is exposed', (t) => {
    t.ok(createPutnik().db);
    t.end();
});

test('sql: interpolates values into template string', (t) => {
    const kind = 'const';
    const table = 'VariableDeclaration';
    const result = sql`SELECT id FROM ${table} WHERE kind = ${kind}`;
    
    t.equal(result, 'SELECT id FROM VariableDeclaration WHERE kind = const');
    t.end();
});

test('createDb: run without params executes statement', (t) => {
    const db = createDb();
    db.exec('CREATE TABLE t (x INTEGER)');
    db.run('INSERT INTO t VALUES (42)');
    const row = db.get('SELECT x FROM t');
    
    t.equal(row.x, 42);
    t.end();
});

test('createDb: all without params returns all rows', (t) => {
    const db = createDb();
    db.exec('CREATE TABLE t (x INTEGER)');
    db.run('INSERT INTO t VALUES (1)');
    db.run('INSERT INTO t VALUES (2)');
    
    t.equal(db.all('SELECT x FROM t').length, 2);
    t.end();
});

test('reader: sourceType defaults to module when db value is null', (t) => {
    const db = setup();
    
    db.run('UPDATE Program SET source_type = NULL WHERE file = :file', {
        file: 'index.js',
    });
    
    t.equal(readAst(db, 'index.js').program.sourceType, 'module');
    t.end();
});

test('reader: returns null when no root node exists', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    db.run(`INSERT INTO Identifier (id, file, parent_id, parent_type, parent_field, start_line, start_col, end_line, end_col, name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        1,
        'orphan.js',
        2,
        'Identifier',
        'id',
        1,
        0,
        1,
        1,
        'ghost',
    ]);
    
    t.notOk(readAst(db, 'orphan.js'));
    t.end();
});

test('writer: node with unknown child type is skipped without throwing', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    const ast = parse('const a = 1;', {
        sourceType: 'module',
    });
    
    ast.program.body[0].declarations[0].id.type = '__Unknown__';
    
    writeAst(db, ast, 'unknown.js');
    
    const rows = db.all('SELECT type FROM file_nodes WHERE file = ?', ['unknown.js']);
    const result = rows
        .map((r) => r.type)
        .includes('__Unknown__');
    
    t.notOk(result);
    t.end();
});

test('writer: non-array object child is written as single node', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = 1;', {
        sourceType: 'module',
    }), 'single.js');
    
    const row = db.get('SELECT name FROM Identifier WHERE file = ?', ['single.js']);
    
    t.equal(row.name, 'a');
    t.end();
});

test('createDb: transaction executes callback', (t) => {
    const db = createDb();
    db.exec('CREATE TABLE t (x INTEGER)');
    db.transaction(() => {
        db.run('INSERT INTO t VALUES (7)');
    });
    
    t.equal(db.get('SELECT x FROM t').x, 7);
    t.end();
});

test('putnik: parseAndWriteToDb stores to _sources', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    
    parseAndWriteToDb(db, 'test.js', 'const a = 1;');
    
    const row = db.get('SELECT source FROM _sources WHERE file = ?', ['test.js']);
    
    t.equal(row.source, 'const a = 1;');
    t.end();
});

test('putnik: transform returns places', async (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    
    parseAndWriteToDb(db, 'test.js', 'const a = 1;');
    
    const places = await transform(db, 'test.js', {
        plugins: [
            ['const-to-let', constPlugin],
        ],
        fix: true,
    });
    
    t.equal(places.length, 0);
    t.end();
});

test('putnik: default export returns [code, places] with let', async (t) => {
    const [code] = await putnik('test.js', 'const a = 1;', {
        plugins: [
            ['const-to-let', constPlugin],
        ],
        fix: true,
    });
    
    const result = code.includes('let a');
    
    t.ok(result);
    t.end();
});

test('putnik: default export places empty after fix', async (t) => {
    const [, places] = await putnik('test.js', 'const a = 1;', {
        plugins: [
            ['const-to-let', constPlugin],
        ],
        fix: true,
    });
    
    t.equal(places.length, 0);
    t.end();
});

test('putnik: default export returns original source when fix is false', async (t) => {
    const [code] = await putnik('test.js', 'const a = 1;', {
        fix: false,
        plugins: [
            ['const-to-let', constPlugin],
        ],
    });
    
    t.equal(code, 'const a = 1;');
    t.end();
});

test('putnik: default export has places when fix is false', async (t) => {
    const [, places] = await putnik('test.js', 'const a = 1;', {
        fix: false,
        plugins: [
            ['const-to-let', constPlugin],
        ],
    });
    
    t.equal(places.length, 1);
    t.end();
});

test('putnik: rules can disable a plugin places empty', async (t) => {
    const [, places] = await putnik('test.js', 'const a = 1;', {
        fix: true,
        plugins: [
            ['const-to-let', constPlugin],
        ],
        rules: {
            'const-to-let': 'off',
        },
    });
    
    t.equal(places.length, 0);
    t.end();
});

test('putnik: rules can disable a plugin preserves const', async (t) => {
    const [code] = await putnik('test.js', 'const a = 1;', {
        fix: true,
        plugins: [
            ['const-to-let', constPlugin],
        ],
        rules: {
            'const-to-let': 'off',
        },
    });
    
    const result = code.includes('const a');
    
    t.ok(result);
    t.end();
});

test('createDb: insert returns generated id', (t) => {
    const db = createDb();
    db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, x INTEGER)');
    const id = db.insert('INSERT INTO t (x) VALUES (42)');
    
    t.equal(id, 1);
    t.end();
});
