import test from 'supertape';
import {parse} from '@babel/parser';
import {
    createDb,
    createAllTables,
    createView,
    writeAst,
    readAst,
    runPlugin,
    parseSqlPlugin,
    validatePlugin,
    loadSqlPlugin,
} from './putnik.js';

test('sql-plugin: parseSqlPlugin splits into select, report, fix', (t) => {
    const raw = `-- @select
SELECT * FROM t WHERE file = :file;

-- @report
SELECT message FROM t WHERE file = :file;

-- @fix
UPDATE t SET x = 1 WHERE file = :file;`;
    
    const plugin = parseSqlPlugin(raw);
    
    t.ok(plugin.select.includes('SELECT'));
    t.ok(plugin.report.includes('SELECT'));
    t.ok(plugin.fix.includes('UPDATE'));
    t.end();
});

test('sql-plugin: parseSqlPlugin returns empty object for empty input', (t) => {
    const plugin = parseSqlPlugin('   \n\n  ');
    t.equal(Object.keys(plugin).length, 0);
    t.end();
});

test('sql-plugin: parseSqlPlugin skips non-tag content', (t) => {
    const raw = `some random text
-- @select
SELECT 1`;
    const plugin = parseSqlPlugin(raw);
    t.ok(plugin.select);
    t.notOk(plugin.fix);
    t.end();
});

test('sql-plugin: validatePlugin passes valid plugin', (t) => {
    const plugin = {
        select: 'SELECT id FROM VariableDeclaration WHERE file = :file',
        report: "SELECT 'test' AS message, 1 AS line, 0 AS col",
        fix: 'UPDATE VariableDeclaration SET kind = "let" WHERE file = :file',
    };
    
    try {
        validatePlugin(plugin);
        t.pass('no error thrown');
    } catch (e) {
        t.fail(e.message);
    }
    
    t.end();
});

test('sql-plugin: validatePlugin throws on non-SELECT in @select', (t) => {
    const plugin = {
        select: 'UPDATE VariableDeclaration SET kind = "let" WHERE file = :file',
    };
    
    try {
        validatePlugin(plugin);
        t.fail('should have thrown');
    } catch (e) {
        t.ok(e.message.includes('SELECT'));
    }
    
    t.end();
});

test('sql-plugin: validatePlugin throws on INSERT in @fix', (t) => {
    const plugin = {
        select: 'SELECT 1',
        fix: 'INSERT INTO VariableDeclaration (kind) VALUES ("let")',
    };
    
    try {
        validatePlugin(plugin);
        t.fail('should have thrown');
    } catch (e) {
        t.ok(e.message.includes('UPDATE'));
    }
    
    t.end();
});

test('sql-plugin: validatePlugin throws on DELETE in @fix', (t) => {
    const plugin = {
        select: 'SELECT 1',
        fix: 'DELETE FROM VariableDeclaration WHERE file = :file',
    };
    
    try {
        validatePlugin(plugin);
        t.fail('should have thrown');
    } catch (e) {
        t.ok(e.message.includes('UPDATE'));
    }
    
    t.end();
});

test('sql-plugin: loadSqlPlugin reads .sql file', (t) => {
    const plugin = loadSqlPlugin(new URL('../lib/plugins/const-to-let.sql', import.meta.url).pathname);
    
    t.ok(plugin.select);
    t.ok(plugin.report);
    t.ok(plugin.fix);
    t.end();
});

function setup() {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = 1;', {sourceType: 'module'}), 'index.js');
    return db;
}

test('runner: runPlugin returns [] when no match', (t) => {
    const db = setup();
    const plugin = {
        select: 'SELECT id FROM VariableDeclaration WHERE file = :file AND kind = "var"',
        report: "SELECT 'test' AS message, 1 AS line, 0 AS col",
    };
    
    const result = runPlugin(db, plugin, 'index.js');
    t.equal(result.length, 0);
    t.end();
});

test('runner: runPlugin report mode returns places', (t) => {
    const db = setup();
    const plugin = {
        select: 'SELECT id FROM VariableDeclaration WHERE file = :file AND kind = "const"',
        report: "SELECT 'Prefer let over const' AS message, start_line AS line, start_col AS col FROM VariableDeclaration WHERE file = :file AND kind = \"const\"",
    };
    
    const result = runPlugin(db, plugin, 'index.js');
    t.equal(result.length, 1);
    t.equal(result[0].message, 'Prefer let over const');
    t.end();
});

test('runner: runPlugin fix mode mutates db', (t) => {
    const db = setup();
    const plugin = {
        select: 'SELECT id FROM VariableDeclaration WHERE file = :file AND kind = "const"',
        report: "SELECT 'Prefer let over const' AS message, start_line AS line, start_col AS col FROM VariableDeclaration WHERE file = :file AND kind = \"const\"",
        fix: 'UPDATE VariableDeclaration SET kind = "let" WHERE file = :file AND kind = "const"',
    };
    
    const result = runPlugin(db, plugin, 'index.js', {fix: true});
    
    t.equal(result.length, 0, 'no results because kind is now "let"');
    
    const row = db.prepare('SELECT kind FROM VariableDeclaration WHERE file = ?').get('index.js');
    t.equal(row.kind, 'let');
    t.end();
});
