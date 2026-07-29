import test from 'supertape';
import {tryCatch} from 'try-catch';
import {montag} from 'montag';
import {
    validatePlugin,
    loadSqlPlugin,
    parseSqlPlugin,
} from '../putnik.js';

const RAW = montag`
    -- @select
    SELECT id FROM VariableDeclaration WHERE file = :file;
    
    -- @report
    SELECT 'test' AS message FROM VariableDeclaration WHERE file = :file;
    
    -- @fix
    UPDATE VariableDeclaration SET kind = 'let' WHERE file = :file;
`;

const loadFixture = (a) => {
    return loadSqlPlugin(new URL(`./fixture/${a}.sql`, import.meta.url).pathname);
};

test('sql-plugin: parseSqlPlugin returns select section', (t) => {
    const result = parseSqlPlugin(RAW).select.includes('SELECT');
    
    t.ok(result);
    t.end();
});

test('sql-plugin: parseSqlPlugin returns report section', (t) => {
    const result = parseSqlPlugin(RAW).report.includes('SELECT');
    
    t.ok(result);
    t.end();
});

test('sql-plugin: parseSqlPlugin returns fix section', (t) => {
    const result = parseSqlPlugin(RAW).fix.includes('UPDATE');
    
    t.ok(result);
    t.end();
});

test('sql-plugin: parseSqlPlugin returns empty object for empty input', (t) => {
    t.equal(Object.keys(parseSqlPlugin('   \n\n  ')).length, 0);
    t.end();
});

test('sql-plugin: parseSqlPlugin skips non-tag content', (t) => {
    t.ok(parseSqlPlugin('some text\n-- @select\nSELECT 1').select);
    t.end();
});

test('sql-plugin: parseSqlPlugin no fix section when absent', (t) => {
    t.notOk(parseSqlPlugin('some text\n-- @select\nSELECT 1').fix);
    t.end();
});

test('sql-plugin: validatePlugin passes valid plugin', (t) => {
    const plugin = {
        select: 'SELECT id FROM VariableDeclaration WHERE file = :file',
        report: `SELECT 'test' AS message, 1 AS line, 0 AS col`,
        fix: `UPDATE VariableDeclaration SET kind = 'let' WHERE file = :file`,
    };
    
    const [error] = tryCatch(validatePlugin, plugin);
    
    t.notOk(error);
    t.end();
});

test('sql-plugin: validatePlugin throws on non-SELECT in @select', (t) => {
    let err;
    const [e] = tryCatch(validatePlugin, {
        select: `UPDATE VariableDeclaration SET kind = 'let' WHERE file = :file`,
    });
    
    if (e)
        err = e;
    
    t.ok(err?.message.includes('SELECT'));
    t.end();
});

test('sql-plugin: validatePlugin allows INSERT in @fix', (t) => {
    const [error] = tryCatch(validatePlugin, {
        select: 'SELECT 1',
        report: `SELECT 'test' AS message, 1 AS line, 0 AS col`,
        fix: `INSERT INTO VariableDeclaration (kind) VALUES ('let')`,
    });
    
    t.notOk(error);
    t.end();
});

test('sql-plugin: validatePlugin allows DELETE in @fix', (t) => {
    const [error] = tryCatch(validatePlugin, {
        select: 'SELECT 1',
        report: `SELECT 'test' AS message, 1 AS line, 0 AS col`,
        fix: 'DELETE FROM VariableDeclaration WHERE file = :file',
    });
    
    t.notOk(error);
    t.end();
});

test('sql-plugin: loadSqlPlugin returns select', (t) => {
    const {select} = loadFixture('no-file');
    
    t.ok(select);
    t.end();
});

test('sql-plugin: loadSqlPlugin returns report', (t) => {
    const {report} = loadFixture('no-file');
    
    t.ok(report);
    t.end();
});

test('sql-plugin: validatePlugin skips non-string values', (t) => {
    const [error] = tryCatch(validatePlugin, {
        select: null,
        report: undefined,
    });
    
    t.notOk(error);
    t.end();
});

test('sql-plugin: validatePlugin throws when @report is not a SELECT', (t) => {
    const [error] = tryCatch(validatePlugin, {
        report: `UPDATE VariableDeclaration SET kind = 'let' WHERE file = :file`,
    });
    
    t.ok(error?.message.includes('SELECT'));
    t.end();
});

test('sql-plugin: validatePlugin throws when @fix is a SELECT', (t) => {
    const [error] = tryCatch(validatePlugin, {
        fix: `SELECT id FROM Foo WHERE file = :file`,
    });
    
    t.ok(error?.message.includes('@fix'));
    t.end();
});

test('sql-plugin: validatePlugin allows INSERT ON CONFLICT in @fix', (t) => {
    const [error] = tryCatch(validatePlugin, {
        fix: `INSERT INTO node_types (file, type) VALUES (:file, :type) ON CONFLICT (file, type) DO NOTHING`,
    });
    
    t.notOk(error);
    t.end();
});

test('sql-plugin: loadSqlPlugin returns fix', (t) => {
    const {fix} = loadFixture('no-file');
    
    t.ok(fix);
    t.end();
});

test('sql-plugin: loadSqlPlugin auto-adds :file to select where', (t) => {
    const {select} = loadFixture('no-file');
    
    t.match(select, ':file');
    t.end();
});

test('sql-plugin: loadSqlPlugin auto-adds :file to fix where', (t) => {
    const {fix} = loadFixture('no-file');
    
    t.match(fix, ':file');
    t.end();
});

test('sql-plugin: loadSqlPlugin throws when fix has no WHERE', (t) => {
    const [error] = tryCatch(loadSqlPlugin, new URL('./fixture/no-where.sql', import.meta.url).pathname);
    
    t.match(error.message, 'WHERE');
    t.end();
});
