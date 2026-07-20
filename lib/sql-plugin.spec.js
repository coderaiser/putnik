import test from 'supertape';
import {tryCatch} from 'try-catch';
import {montag} from 'montag';
import {
    parseSqlPlugin,
    validatePlugin,
    loadSqlPlugin,
} from './putnik.js';

const RAW = montag`
    -- @select
    SELECT id FROM VariableDeclaration WHERE file = :file;
    
    -- @report
    SELECT 'test' AS message FROM VariableDeclaration WHERE file = :file;
    
    -- @fix
    UPDATE VariableDeclaration SET kind = 'let' WHERE file = :file;
`;

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

test('sql-plugin: validatePlugin throws on INSERT in @fix', (t) => {
    let err;
    const [e] = tryCatch(validatePlugin, {
        select: 'SELECT 1',
        fix: `INSERT INTO VariableDeclaration (kind) VALUES ('let')`,
    });
    
    if (e)
        err = e;
    
    t.ok(err?.message.includes('UPDATE'));
    t.end();
});

test('sql-plugin: validatePlugin throws on DELETE in @fix', (t) => {
    let err;
    const [e] = tryCatch(validatePlugin, {
        select: 'SELECT 1',
        fix: 'DELETE FROM VariableDeclaration WHERE file = :file',
    });
    
    if (e)
        err = e;
    
    t.ok(err?.message.includes('UPDATE'));
    t.end();
});

test('sql-plugin: loadSqlPlugin returns select', (t) => {
    t.ok(loadSqlPlugin(new URL('../lib/plugins/const-to-let.sql', import.meta.url).pathname).select);
    t.end();
});

test('sql-plugin: loadSqlPlugin returns report', (t) => {
    t.ok(loadSqlPlugin(new URL('../lib/plugins/const-to-let.sql', import.meta.url).pathname).report);
    t.end();
});

test('sql-plugin: loadSqlPlugin returns fix', (t) => {
    t.ok(loadSqlPlugin(new URL('../lib/plugins/const-to-let.sql', import.meta.url).pathname).fix);
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
