import {test} from 'supertape';
import {loadPlugin} from './sql-plugin/sql-plugin.js';
import {
    parse,
    transformAll,
    printAll,
} from './putnik.js';

const isNaNPlugin = loadPlugin(new URL('plugins/apply-is-nan.sql', import.meta.url).pathname);

const plugins = [
    ['apply-is-nan', isNaNPlugin],
];

test('putnik: parse: multi-file writes first file into shared db', async (t) => {
    const db = await parse(['a.js', 'b.js'], ['const a = 1;', 'const b = 2;']);
    
    const files = db
        .all(`SELECT file FROM Program`)
        .map(({file}) => file);
    
    const result = files.includes('a.js');
    
    t.ok(result);
    t.end();
});

test('putnik: parse: multi-file writes second file into shared db', async (t) => {
    const db = await parse(['a.js', 'b.js'], ['const a = 1;', 'const b = 2;']);
    
    const files = db
        .all(`SELECT file FROM Program`)
        .map(({file}) => file);
    
    const result = files.includes('b.js');
    
    t.ok(result);
    t.end();
});

test('putnik: parse: single file call still works', async (t) => {
    const db = await parse('t.js', 'const a = 1;');
    
    const rows = db.all(`SELECT file FROM Program`);
    
    t.equal(rows.length, 1);
    t.end();
});

test('putnik: parse: single file via array overload works', async (t) => {
    const db = await parse(['t.js'], ['const a = 1;']);
    
    const rows = db.all(`SELECT file FROM Program WHERE file = ?`, ['t.js']);
    
    t.equal(rows.length, 1);
    t.end();
});

const crossFilePlugin = {
    select: `SELECT id FROM VariableDeclaration WHERE kind = 'const'`,
    report: `SELECT 'const' AS message, 1 AS line, 0 AS col`,
};

test('putnik: transformAll: collects places from all files', async (t) => {
    const db = await parse(['a.js', 'b.js'], ['const a = 1;', 'const b = 2;']);
    
    const places = await transformAll(['a.js', 'b.js'], db, {
        plugins: [
            ['cross-file', crossFilePlugin],
        ],
        fix: false,
    });
    
    t.equal(places.length, 2);
    t.end();
});

test('putnik: transformAll: runs cross-file fix on both files', async (t) => {
    const db = await parse(['a.js', 'b.js'], ['const a = 1;', 'const b = 2;']);
    
    await transformAll(['a.js', 'b.js'], db, {
        plugins: [
            ['const-to-let', {
                select: `SELECT id FROM VariableDeclaration WHERE file = :file AND kind = 'const'`,
                report: `SELECT 'const' AS message, 1 AS line, 0 AS col`,
                fix: `UPDATE VariableDeclaration SET kind = 'let' WHERE file = :file AND kind = 'const'`,
            }],
        ],
    });
    
    const rows = db.all(`SELECT kind FROM VariableDeclaration WHERE kind = 'let'`);
    
    t.equal(rows.length, 2);
    t.end();
});

test('putnik: transformAll: respects rules off', async (t) => {
    const db = await parse(['a.js', 'b.js'], ['const a = 1;', 'const b = 2;']);
    
    const places = await transformAll(['a.js', 'b.js'], db, {
        plugins: [
            ['cross-file', crossFilePlugin],
        ],
        rules: {
            'cross-file': 'off',
        },
        fix: false,
    });
    
    t.equal(places.length, 0);
    t.end();
});

test('putnik: printAll: returns map of file -> code', async (t) => {
    const db = await parse(['a.js', 'b.js'], ['const a = 1;', 'const b = 2;']);
    
    const result = await printAll(['a.js', 'b.js'], db);
    
    t.ok(result instanceof Map);
    t.end();
});

test('putnik: printAll: prints both files unchanged', async (t) => {
    const db = await parse(['a.js', 'b.js'], ['const a = 1;\n', 'const b = 2;\n']);
    
    const result = await printAll(['a.js', 'b.js'], db);
    
    t.equal(result.get('a.js') + result.get('b.js'), 'const a = 1;\nconst b = 2;\n');
    t.end();
});

test('putnik: printAll: reflects transform mutation across files', async (t) => {
    const db = await parse(['a.js', 'b.js'], ['const a = 1;\n', 'const b = 2;\n']);
    
    await transformAll(['a.js', 'b.js'], db, {
        plugins: [
            ['const-to-let', {
                select: `SELECT id FROM VariableDeclaration WHERE file = :file AND kind = 'const'`,
                report: `SELECT 'const' AS message, 1 AS line, 0 AS col`,
                fix: `UPDATE VariableDeclaration SET kind = 'let' WHERE file = :file AND kind = 'const'`,
            }],
        ],
    });
    
    const result = await printAll(['a.js', 'b.js'], db);
    
    t.match(result.get('a.js'), 'let a');
    t.end();
});

test('putnik: transformAll: join query does not report other files', async (t) => {
    const db = await parse(['a.js', 'b.js'], ['x === NaN;', 'const y = 1;']);
    const result = await transformAll(['b.js'], db, {
        plugins,
    });
    const expected = [];
    
    t.deepEqual(result, expected);
    t.end();
});

test('putnik: transformAll: join query reports own file', async (t) => {
    const db = await parse(['a.js', 'b.js'], ['x === NaN;', 'const y = 1;']);
    const places = await transformAll(['a.js'], db, {
        plugins,
    });
    
    t.equal(places.length, 1);
    t.end();
});

test('putnik: transformAll: join query fix does not touch other files', async (t) => {
    const db = await parse(['a.js', 'b.js'], ['x === NaN;', 'const y = 1;']);
    
    await transformAll(['b.js'], db, {
        plugins,
        fix: true,
    });
    
    const [{n}] = db.all(`SELECT COUNT(*) AS n FROM CallExpression`);
    
    t.equal(n, 0);
    t.end();
});

test('putnik: transformAll: WHERE of a join query is kept', async (t) => {
    const db = await parse(['a.js'], ['x + NaN;']);
    const result = await transformAll(['a.js'], db, {
        plugins,
    });
    const expected = [];
    
    t.deepEqual(result, expected);
    t.end();
});
