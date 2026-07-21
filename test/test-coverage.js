import {test} from 'supertape';
import {parse} from '@putout/babel';
import {runPlugin} from '../lib/runner.js';
import {
    createDb,
    createAllTables,
    createView,
    writeAst,
    readAst,
    createIndexForField,
    createPutnik,
    createTable,
    sql,
    parseAndWriteToDb,
    transform,
} from '../lib/putnik.js';
import {
    loadSqlPlugin,
    validatePlugin,
    parseSqlPlugin,
} from '../lib/sql-plugin.js';

const setup = () => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = 1;', {
        sourceType: 'module',
    }), 'index.js');
    
    return db;
};

test('sql: interpolates', (t) => {
    const result = sql`SELECT id FROM X WHERE kind = const`;
    
    t.equal(result, 'SELECT id FROM X WHERE kind = const');
    t.end();
});

test('createPutnik: print no ast', (t) => {
    const result = createPutnik().print('x.js');
    const expected = '';
    
    t.equal(result, expected);
    t.end();
});

test('createPutnik: pdg', (t) => {
    const p = createPutnik();
    p.parse('t.js', 'const a = 1;');
    t.equal(p.getAst('t.js').program.body[0].kind, 'const');
    
    const result = p
        .print('t.js')
        .includes('const a = 1');
    
    t.ok(result);
    t.ok(p.db);
    t.end();
});

test('createIndexForField: idx', (t) => {
    const db = createDb();
    createAllTables(db);
    createIndexForField(db, 'VariableDeclaration', 'kind');
    const row = db.get(`SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_VariableDeclaration_kind'`);
    
    t.equal(row.name, 'idx_VariableDeclaration_kind');
    t.end();
});

test('createTable: extras', (t) => {
    const db = createDb();
    createTable(db, 'Program');
    const result = db
        .all('PRAGMA table_info(Program)')
        .map((r) => r.name)
        .includes('source_type');
    
    t.ok(result);
    t.end();
});

test('createAllTables: _sources', (t) => {
    const db = createDb();
    createAllTables(db);
    
    t.equal(db.get(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = '_sources'`).name, '_sources');
    t.end();
});

test('transform: empty', async (t) => {
    t.equal((await transform(setup(), 'index.js')).length, 0);
    t.end();
});

test('parseAndWriteToDb: src', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    parseAndWriteToDb(db, 't.js', 'const a = 1;');
    
    t.equal(db.get('SELECT source FROM _sources WHERE file = ?', ['t.js']).source, 'const a = 1;');
    t.end();
});

test('readAst: srcType default', (t) => {
    const db = setup();
    
    db.run('UPDATE Program SET source_type = NULL WHERE file = :file', {
        file: 'index.js',
    });
    
    t.equal(readAst(db, 'index.js').program.sourceType, 'module');
    t.end();
});

test('readAst: null no rows', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    const result = readAst(db, 'x.js');
    
    t.notOk(result);
    t.end();
});

test('readAst: null del root', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = 1;', {
        sourceType: 'module',
    }), 'e.js');
    db.run('DELETE FROM Program WHERE file = ?', ['e.js']);
    
    t.notOk(readAst(db, 'e.js'));
    t.end();
});

test('readAst: debugger', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('debugger;', {
        sourceType: 'module',
    }), 'd.js');
    
    t.equal(readAst(db, 'd.js').program.body[0].type, 'DebuggerStatement');
    t.end();
});

test('readAst: memb bool', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('a[b];', {
        sourceType: 'module',
    }), 'm.js');
    
    const result = typeof readAst(db, 'm.js').program.body[0].expression.computed;
    const expected = 'boolean';
    
    t.equal(result, expected);
    t.end();
});

test('writer: bool lit', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = true;', {
        sourceType: 'module',
    }), 'b.js');
    
    t.equal(readAst(db, 'b.js').program.body[0].declarations[0].init.value, 1);
    t.end();
});

test('writer: null lit', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = null;', {
        sourceType: 'module',
    }), 'n.js');
    
    t.ok(readAst(db, 'n.js'));
    t.end();
});

test('writer: regexp', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = /test/gi;', {
        sourceType: 'module',
    }), 'r.js');
    
    const n = readAst(db, 'r.js').program.body[0].declarations[0].init;
    
    t.equal(n.pattern, 'test');
    t.equal(n.flags, 'gi');
    t.end();
});

test('writer: bigint', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = 1n;', {
        sourceType: 'module',
    }), 'bi.js');
    
    t.ok(readAst(db, 'bi.js'));
    t.end();
});

test('writer: template', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = `hello`;', {
        sourceType: 'module',
    }), 'tl.js');
    
    t.ok(readAst(db, 'tl.js'));
    t.end();
});

test('writer: unary', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = -1;', {
        sourceType: 'module',
    }), 'u.js');
    
    t.equal(readAst(db, 'u.js').program.body[0].declarations[0].init.operator, '-');
    t.end();
});

test('writer: assign', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('a = 1;', {
        sourceType: 'module',
    }), 'as.js');
    
    t.equal(readAst(db, 'as.js').program.body[0].expression.operator, '=');
    t.end();
});

test('writer: binary', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = 1 + 2;', {
        sourceType: 'module',
    }), 'be.js');
    
    t.equal(readAst(db, 'be.js').program.body[0].declarations[0].init.operator, '+');
    t.end();
});

test('writer: logical', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = true && false;', {
        sourceType: 'module',
    }), 'le.js');
    
    t.equal(readAst(db, 'le.js').program.body[0].declarations[0].init.operator, '&&');
    t.end();
});

test('writer: update', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('let a = 0; a++;', {
        sourceType: 'module',
    }), 'ue.js');
    
    t.equal(readAst(db, 'ue.js').program.body[1].expression.operator, '++');
    t.end();
});

test('writer: forof', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('for await (const a of [1]) {}', {
        sourceType: 'module',
        plugins: ['asyncGenerators'],
    }), 'fo.js');
    
    const result = typeof readAst(db, 'fo.js').program.body[0].await;
    const expected = 'boolean';
    
    t.equal(result, expected);
    t.end();
});

test('writer: yield', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('function* g() { yield 1; }', {
        sourceType: 'module',
    }), 'y.js');
    
    const result = typeof readAst(db, 'y.js').program.body[0].body.body[0].delegate;
    const expected = 'boolean';
    
    t.equal(result, expected);
    t.end();
});

test('writer: import', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('import fs from "fs";', {
        sourceType: 'module',
    }), 'i.js');
    
    t.equal(readAst(db, 'i.js').program.body[0].source.value, 'fs');
    t.end();
});

test('writer: export', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('export { a };', {
        sourceType: 'module',
    }), 'e.js');
    
    t.ok(readAst(db, 'e.js'));
    t.end();
});

test('writer: jsx', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = <br />;', {
        sourceType: 'module',
        plugins: ['jsx'],
    }), 'j.js');
    
    t.ok(readAst(db, 'j.js'));
    t.end();
});

test('writer: jsx id', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = <div></div>;', {
        sourceType: 'module',
        plugins: ['jsx'],
    }), 'ji.js');
    const o = readAst(db, 'ji.js').program.body[0].declarations[0].init.openingElement;
    
    t.equal(o.name.name, 'div');
    t.end();
});

test('writer: jsx text', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = <div>hello</div>;', {
        sourceType: 'module',
        plugins: ['jsx'],
    }), 'jt.js');
    
    t.ok(readAst(db, 'jt.js'));
    t.end();
});

test('writer: private prop', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('class Foo { #x = 1; }', {
        sourceType: 'module',
        plugins: ['classPrivateProperties'],
    }), 'cp.js');
    
    t.ok(readAst(db, 'cp.js'));
    t.end();
});

test('writer: null prog', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    const ast = parse('const a = 1;', {
        sourceType: 'module',
    });
    
    ast.program = null;
    writeAst(db, ast, 't.js');
    
    t.notOk(readAst(db, 't.js'));
    t.end();
});

test('sqlPlugin: parse', (t) => {
    const raw = '-- @select\nSELECT 1\n-- @report\nSELECT 2';
    const p = parseSqlPlugin(raw);
    
    t.ok(p.select);
    t.ok(p.report);
    t.notOk(p.fix);
    t.end();
});

test('sqlPlugin: empty', (t) => {
    const result = parseSqlPlugin('   \n\n  ');
    
    t.equal(Object.keys(result).length, 0);
    t.end();
});

test('sqlPlugin: validate skip', async (t) => {
    const {tryCatch} = await import('try-catch');
    const [e] = tryCatch(validatePlugin, {
        select: null,
        report: undefined,
    });
    
    t.notOk(e);
    t.end();
});

test('sqlPlugin: validate sel err', async (t) => {
    const {tryCatch} = await import('try-catch');
    const [e] = tryCatch(validatePlugin, {
        select: 'UPDATE t',
    });
    
    const result = e.message.includes('SELECT');
    
    t.ok(result);
    t.end();
});

test('sqlPlugin: validate rpt err', async (t) => {
    const {tryCatch} = await import('try-catch');
    const [e] = tryCatch(validatePlugin, {
        report: 'UPDATE t',
    });
    
    const result = e.message.includes('SELECT');
    
    t.ok(result);
    t.end();
});

test('sqlPlugin: insert fix', async (t) => {
    const {tryCatch} = await import('try-catch');
    const [e] = tryCatch(validatePlugin, {
        select: 'SELECT 1',
        report: 'SELECT 1',
        fix: 'INSERT INTO t VALUES (1)',
    });
    
    t.notOk(e);
    t.end();
});

test('sqlPlugin: delete fix', async (t) => {
    const {tryCatch} = await import('try-catch');
    const [e] = tryCatch(validatePlugin, {
        select: 'SELECT 1',
        report: 'SELECT 1',
        fix: 'DELETE FROM t',
    });
    
    t.notOk(e);
    t.end();
});

test('loadSqlPlugin: loads', (t) => {
    const url = new URL('../lib/plugins/const-to-let.sql', import.meta.url);
    const p = loadSqlPlugin(url.pathname);
    
    t.ok(p.select);
    t.ok(p.report);
    t.ok(p.fix);
    t.end();
});

test('runPlugin: no match', async (t) => {
    const res = await runPlugin(setup(), {
        select: `SELECT id FROM VariableDeclaration WHERE file = :file AND kind = 'var'`,
        report: `SELECT 'test' AS message, 1 AS line, 0 AS col`,
    }, 'index.js');
    
    t.equal(res.length, 0);
    t.end();
});

test('prepare: run/get all', (t) => {
    const db = createDb();
    db.exec('CREATE TABLE t (x INTEGER)');
    db.run('INSERT INTO t VALUES (42)');
    t.equal(db.get('SELECT x FROM t').x, 42);
    t.equal(db.all('SELECT x FROM t').length, 1);
    t.end();
});

test('prepare: insert id', (t) => {
    const db = createDb();
    db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, x INTEGER)');
    
    const result = db.insert('INSERT INTO t (x) VALUES (42)');
    const expected = 1;
    
    t.equal(result, expected);
    t.end();
});

test('default export: fixes', async (t) => {
    const {default: d} = await import('../lib/putnik.js');
    const [code] = await d('t.js', 'const a = 1;', {
        plugins: [],
        fix: true,
    });
    
    const result = code.includes('const a');
    
    t.ok(result);
    t.end();
});

test('default export: no fix', async (t) => {
    const {default: d} = await import('../lib/putnik.js');
    const [code] = await d('t.js', 'const a = 1;', {
        fix: false,
        plugins: [],
    });
    
    t.equal(code, 'const a = 1;');
    t.end();
});
