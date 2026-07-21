import {test} from 'supertape';
import {parse} from 'putout';
import {tryCatch} from 'try-catch';
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
    writeAst(db, parse('const a = 1;'), 'index.js');
    
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

test('createPutnik: getAst', (t) => {
    const {parse, getAst} = createPutnik();
    
    parse('t.js', 'const a = 1;');
    
    const ast = getAst('t.js');
    const {kind} = ast.program.body[0];
    
    t.equal(kind, 'const');
    t.end();
});

test('createPutnik: print', (t) => {
    const {parse, print} = createPutnik();
    
    parse('t.js', 'const a = 1;');
    
    const result = print('t.js');
    const expected = 'const a = 1;\n';
    
    t.equal(result, expected);
    t.end();
});

test('createPutnik: db', (t) => {
    const {parse, db} = createPutnik();
    
    parse('t.js', 'const a = 1;');
    
    t.ok(db);
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
    writeAst(db, parse('const a = 1;'), 'e.js');
    db.run('DELETE FROM Program WHERE file = ?', ['e.js']);
    
    t.notOk(readAst(db, 'e.js'));
    t.end();
});

test('readAst: debugger', (t) => {
    const db = createDb();
    
    createAllTables(db);
    createView(db);
    writeAst(db, parse('debugger;'), 'd.js');
    
    t.equal(readAst(db, 'd.js').program.body[0].type, 'DebuggerStatement');
    t.end();
});

test('readAst: memb bool', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('a[b];'), 'm.js');
    
    const result = typeof readAst(db, 'm.js').program.body[0].expression.computed;
    const expected = 'boolean';
    
    t.equal(result, expected);
    t.end();
});

test('writer: bool lit', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = true;'), 'b.js');
    
    t.equal(readAst(db, 'b.js').program.body[0].declarations[0].init.value, 1);
    t.end();
});

test('writer: null lit', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = null;'), 'n.js');
    
    t.ok(readAst(db, 'n.js'));
    t.end();
});

test('writer: regexp: pattern', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    
    const astFrom = parse('const a = /test/gi;');
    writeAst(db, astFrom, 'r.js');
    
    const {pattern} = readAst(db, 'r.js').program.body[0].declarations[0].init;
    
    t.equal(pattern, 'test');
    t.end();
});

test('writer: regexp: flags', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    
    const astFrom = parse('const a = /test/gi;');
    writeAst(db, astFrom, 'r.js');
    
    const {flags} = readAst(db, 'r.js').program.body[0].declarations[0].init;
    
    t.equal(flags, 'gi');
    t.end();
});

test('writer: bigint', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = 1n;'), 'bi.js');
    
    t.ok(readAst(db, 'bi.js'));
    t.end();
});

test('writer: template', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = `hello`;'), 'tl.js');
    
    t.ok(readAst(db, 'tl.js'));
    t.end();
});

test('writer: unary', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = -1;'), 'u.js');
    
    t.equal(readAst(db, 'u.js').program.body[0].declarations[0].init.operator, '-');
    t.end();
});

test('writer: assign', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('a = 1;'), 'as.js');
    
    t.equal(readAst(db, 'as.js').program.body[0].expression.operator, '=');
    t.end();
});

test('writer: binary', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = 1 + 2;'), 'be.js');
    
    t.equal(readAst(db, 'be.js').program.body[0].declarations[0].init.operator, '+');
    t.end();
});

test('writer: logical', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = true && false;'), 'le.js');
    
    t.equal(readAst(db, 'le.js').program.body[0].declarations[0].init.operator, '&&');
    t.end();
});

test('writer: update', (t) => {
    const db = createDb();
    
    createAllTables(db);
    createView(db);
    
    const astFrom = parse('let a = 0; a++;');
    writeAst(db, astFrom, 'ue.js');
    
    const ast = readAst(db, 'ue.js');
    const {operator} = ast.program.body[1].expression;
    
    t.equal(operator, '++');
    t.end();
});

test('writer: for..of', (t) => {
    const db = createDb();
    
    createAllTables(db);
    createView(db);
    
    const astFrom = parse('for await (const a of [1]) {}');
    
    writeAst(db, astFrom, 'fo.js');
    
    const astTo = readAst(db, 'fo.js');
    
    const result = astTo.program.body[0].await;
    const type = typeof result;
    const expected = 'boolean';
    
    t.equal(type, expected);
    t.end();
});

test('writer: yield', (t) => {
    const db = createDb();
    
    createAllTables(db);
    createView(db);
    writeAst(db, parse('function* g() { yield 1; }'), 'y.js');
    
    const {delegate} = readAst(db, 'y.js').program.body[0].body.body[0].expression;
    
    const type = typeof delegate;
    const expected = 'boolean';
    
    t.equal(type, expected);
    t.end();
});

test('writer: import', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('import fs from "fs";'), 'i.js');
    
    t.equal(readAst(db, 'i.js').program.body[0].source.value, 'fs');
    t.end();
});

test('writer: export', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = 1; export { a };'), 'e.js');
    
    const {type} = readAst(db, 'e.js');
    
    t.equal(type, 'File');
    t.end();
});

test('writer: jsx', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = <br />;'), 'j.js');
    
    t.ok(readAst(db, 'j.js'));
    t.end();
});

test('writer: jsx id', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = <div></div>;'), 'ji.js');
    const o = readAst(db, 'ji.js').program.body[0].declarations[0].init.openingElement;
    
    t.equal(o.name.name, 'div');
    t.end();
});

test('writer: jsx text', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = <div>hello</div>;'), 'jt.js');
    
    t.ok(readAst(db, 'jt.js'));
    t.end();
});

test('writer: private prop', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('class Foo { #x = 1; }'), 'cp.js');
    
    t.ok(readAst(db, 'cp.js'));
    t.end();
});

test('writer: null prog', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    const ast = parse('const a = 1;');
    
    ast.program = null;
    writeAst(db, ast, 't.js');
    
    t.notOk(readAst(db, 't.js'));
    t.end();
});

test('sqlPlugin: parse: report', (t) => {
    const raw = '-- @select\nSELECT 1\n-- @report\nSELECT 2';
    const {report} = parseSqlPlugin(raw);
    
    t.ok(report);
    t.end();
});

test('sqlPlugin: parse: select', (t) => {
    const raw = '-- @select\nSELECT 1\n-- @report\nSELECT 2';
    const {select} = parseSqlPlugin(raw);
    
    t.ok(select);
    t.end();
});

test('sqlPlugin: parse: fix', (t) => {
    const raw = '-- @select\nSELECT 1\n-- @report\nSELECT 2';
    const {fix} = parseSqlPlugin(raw);
    
    t.notOk(fix);
    t.end();
});

test('sqlPlugin: empty', (t) => {
    const result = parseSqlPlugin('   \n\n  ');
    
    t.equal(Object.keys(result).length, 0);
    t.end();
});

test('sqlPlugin: validate skip', (t) => {
    const [e] = tryCatch(validatePlugin, {
        select: null,
        report: undefined,
    });
    
    t.notOk(e);
    t.end();
});

test('sqlPlugin: validate: select:error', (t) => {
    const [e] = tryCatch(validatePlugin, {
        select: 'UPDATE t',
    });
    
    t.match(e.message, 'Expected');
    t.end();
});

test('sqlPlugin: validate report error', (t) => {
    const [e] = tryCatch(validatePlugin, {
        report: 'UPDATE t',
    });
    
    t.match(e.message, 'Expected');
    t.end();
});

test('sqlPlugin: insert fix', (t) => {
    const [e] = tryCatch(validatePlugin, {
        select: 'SELECT 1',
        report: 'SELECT 1',
        fix: 'INSERT INTO t VALUES (1)',
    });
    
    t.notOk(e);
    t.end();
});

test('sqlPlugin: delete fix', (t) => {
    const [e] = tryCatch(validatePlugin, {
        select: 'SELECT 1',
        report: 'SELECT 1',
        fix: 'DELETE FROM t',
    });
    
    t.notOk(e);
    t.end();
});

test('loadSqlPlugin: loads: select', (t) => {
    const url = new URL('../lib/plugins/const-to-let.sql', import.meta.url);
    const {select} = loadSqlPlugin(url.pathname);
    
    t.ok(select);
    t.end();
});

test('loadSqlPlugin: loads: report', (t) => {
    const url = new URL('../lib/plugins/const-to-let.sql', import.meta.url);
    const {report} = loadSqlPlugin(url.pathname);
    
    t.ok(report);
    t.end();
});

test('loadSqlPlugin: loads: fix', (t) => {
    const url = new URL('../lib/plugins/const-to-let.sql', import.meta.url);
    const {fix} = loadSqlPlugin(url.pathname);
    
    t.ok(fix);
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

test('prepare: run: get', (t) => {
    const db = createDb();
    
    db.exec('CREATE TABLE t (x INTEGER)');
    db.run('INSERT INTO t VALUES (42)');
    
    t.equal(db.get('SELECT x FROM t').x, 42);
    t.end();
});

test('prepare: run: all', (t) => {
    const db = createDb();
    
    db.exec('CREATE TABLE t (x INTEGER)');
    db.run('INSERT INTO t VALUES (42)');
    
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
