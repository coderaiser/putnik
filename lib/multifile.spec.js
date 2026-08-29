import {test} from 'supertape';
import {parse, print, transformAll, printAll} from './putnik.js';

test('putnik: parse: multi-file writes first file into shared db', async (t) => {
    const db = await parse(
        ['a.js', 'b.js'],
        ['const a = 1;', 'const b = 2;'],
    );
    
    const rows = db.all(`SELECT file FROM Program`);
    const files = rows.map((r) => r.file);
    
    t.ok(files.includes('a.js'));
    t.end();
});

test('putnik: parse: multi-file writes second file into shared db', async (t) => {
    const db = await parse(
        ['a.js', 'b.js'],
        ['const a = 1;', 'const b = 2;'],
    );
    
    const rows = db.all(`SELECT file FROM Program`);
    const files = rows.map((r) => r.file);
    
    t.ok(files.includes('b.js'));
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
    const db = await parse(
        ['a.js', 'b.js'],
        ['const a = 1;', 'const b = 2;'],
    );
    
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
    const db = await parse(
        ['a.js', 'b.js'],
        ['const a = 1;', 'const b = 2;'],
    );
    
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
    const db = await parse(
        ['a.js', 'b.js'],
        ['const a = 1;', 'const b = 2;'],
    );
    
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
    const db = await parse(
        ['a.js', 'b.js'],
        ['const a = 1;', 'const b = 2;'],
    );
    
    const result = await printAll(['a.js', 'b.js'], db);
    
    t.ok(result instanceof Map);
    t.end();
});

test('putnik: printAll: prints both files unchanged', async (t) => {
    const db = await parse(
        ['a.js', 'b.js'],
        ['const a = 1;\n', 'const b = 2;\n'],
    );
    
    const result = await printAll(['a.js', 'b.js'], db);
    
    t.equal(result.get('a.js') + result.get('b.js'), 'const a = 1;\nconst b = 2;\n');
    t.end();
});

test('putnik: printAll: reflects transform mutation across files', async (t) => {
    const db = await parse(
        ['a.js', 'b.js'],
        ['const a = 1;\n', 'const b = 2;\n'],
    );
    
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
    
    t.ok(result.get('a.js').includes('let a'));
    t.end();
});
