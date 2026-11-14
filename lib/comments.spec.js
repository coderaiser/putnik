import {test} from 'supertape';
import {montag} from 'montag';
import {createDb} from './db/sqlite.js';
import {writeComments} from './writer.js';
import {
    parse,
    readAst,
    print,
    createCommentsTable,
} from './putnik.js';

const getCommentsColumns = async () => {
    const db = createDb();
    
    await createCommentsTable(db);
    
    const cols = db
        .all('PRAGMA table_info(Comments)')
        .map((r) => r.name);
    
    return cols;
};

const hasColumn = async (column) => {
    const cols = await getCommentsColumns();
    
    return cols.includes(column);
};

test(`putnik: createCommentsTable: creates Comments table: 'value' column`, async (t) => {
    const result = await hasColumn('value');
    
    t.ok(result);
    t.end();
});

test(`putnik: createCommentsTable: creates Comments table: 'file' column`, async (t) => {
    const result = await hasColumn('file');
    
    t.ok(result);
    t.end();
});

test(`putnik: createCommentsTable: creates Comments table: 'node_id' column`, async (t) => {
    const result = await hasColumn('node_id');
    
    t.ok(result);
    t.end();
});

test(`putnik: createCommentsTable: creates Comments table: 'type' column`, async (t) => {
    const result = await hasColumn('type');
    
    t.ok(result);
    t.end();
});

test(`putnik: createCommentsTable: creates Comments table: 'leading' column`, async (t) => {
    const result = await hasColumn('leading');
    
    t.ok(result);
    t.end();
});

test(`putnik: createCommentsTable: creates Comments table: 'trailing' column`, async (t) => {
    const result = await hasColumn('trailing');
    
    t.ok(result);
    t.end();
});

test(`putnik: createCommentsTable: creates Comments table: 'start_line' column`, async (t) => {
    const result = await hasColumn('start_line');
    
    t.ok(result);
    t.end();
});

test(`putnik: createCommentsTable: creates Comments table: 'start_col' column`, async (t) => {
    const result = await hasColumn('start_col');
    
    t.ok(result);
    t.end();
});

const commentsSource = `// top
const a = 1; // inline
/* block */
function f() {}
`;

const parseCommentsDb = () => parse('t.js', commentsSource);

const parseCommentsRows = async () => {
    const db = await parseCommentsDb();
    
    return db.all('SELECT * FROM Comments WHERE file = ?', ['t.js']);
};

test('putnik: parse writes Comments row for leading line comment', async (t) => {
    const rows = await parseCommentsRows();
    const result = rows.some((r) => r.type === 'CommentLine' && r.value === ' top' && r.leading === 1);
    
    t.ok(result);
    t.end();
});

test('putnik: parse writes Comments row for trailing line comment', async (t) => {
    const rows = await parseCommentsRows();
    const result = rows.some((r) => r.type === 'CommentLine' && r.value === ' inline' && r.trailing === 1);
    
    t.ok(result);
    t.end();
});

test('putnik: parse writes Comments row for block comment', async (t) => {
    const rows = await parseCommentsRows();
    const result = rows.some((r) => r.type === 'CommentBlock' && r.value === ' block ');
    
    t.ok(result);
    t.end();
});

test('putnik: parse: leading comment attached as leading=1', async (t) => {
    const db = await parse('t.js', '// leading\nconst a = 1;');
    
    const rows = db.all('SELECT * FROM Comments WHERE file = ?', ['t.js']);
    const result = rows.some((r) => r.type === 'CommentLine' && r.leading === 1);
    
    t.ok(result);
    t.end();
});

test('putnik: parse: trailing comment attached as trailing=1', async (t) => {
    const db = await parse('t.js', 'const a = 1; // trailing');
    
    const rows = db.all('SELECT * FROM Comments WHERE file = ?', ['t.js']);
    const result = rows.some((r) => r.type === 'CommentLine' && r.trailing === 1);
    
    t.ok(result);
    t.end();
});

test('putnik: parse: node without comments writes no Comment rows', async (t) => {
    const db = await parse('t.js', 'const a = 1;');
    
    const rows = db.all('SELECT * FROM Comments WHERE file = ?', ['t.js']);
    
    t.equal(rows.length, 0);
    t.end();
});

test('putnik: writeComments skips comment without loc', async (t) => {
    const db = createDb();
    await createCommentsTable(db);
    
    const node = {
        type: 'ExpressionStatement',
        leadingComments: [{
            type: 'CommentLine',
            value: ' no loc',
        }],
        trailingComments: [{
            type: 'CommentBlock',
            value: ' no loc block',
            loc: {
                start: {
                    line: 1,
                    column: 0,
                },
                end: {
                    line: 1,
                    column: 5,
                },
            },
        }],
    };
    
    await writeComments(db, node, 't.js', 1, 'ExpressionStatement');
    
    const rows = db.all('SELECT * FROM Comments WHERE file = ?', ['t.js']);
    
    t.equal(rows.length, 1);
    t.end();
});

test('putnik: readComments re-attaches leading comments to AST nodes', async (t) => {
    const db = await parse('t.js', '// leading\nconst a = 1;');
    
    const ast = await readAst(db, 't.js');
    const [decl] = ast.program.body;
    
    t.ok(decl.leadingComments);
    t.end();
});

test('putnik: readComments re-attaches trailing comments to AST nodes', async (t) => {
    const db = await parse('t.js', 'const a = 1; // trailing');
    
    const ast = await readAst(db, 't.js');
    const [decl] = ast.program.body;
    
    t.ok(decl.trailingComments);
    t.end();
});

test('putnik: writeComments stores inner comment with inner=1', async (t) => {
    const db = createDb();
    await createCommentsTable(db);
    
    const node = {
        type: 'BlockStatement',
        innerComments: [{
            type: 'CommentBlock',
            value: ' inner',
            loc: {
                start: {
                    line: 1,
                    column: 0,
                },
                end: {
                    line: 1,
                    column: 10,
                },
            },
        }],
    };
    
    await writeComments(db, node, 't.js', 1, 'BlockStatement');
    
    const [row] = db.all('SELECT * FROM Comments WHERE file = ?', ['t.js']);
    
    t.equal(row.inner, 1);
    t.end();
});

test('putnik: parse stores inner comment attached to node it is inside', async (t) => {
    const db = await parse('t.js', 'const o = {/* inner */};');
    
    const rows = db.all('SELECT * FROM Comments WHERE file = ?', ['t.js']);
    const result = rows.some((r) => r.inner === 1);
    
    t.ok(result);
    t.end();
});

test('putnik: readComments re-attaches inner comments to AST nodes', async (t) => {
    const db = await parse('t.js', 'const o = {/* inner */};');
    
    const ast = await readAst(db, 't.js');
    const obj = ast.program.body[0].declarations[0].init;
    
    t.ok(obj.innerComments);
    t.end();
});

test('putnik: print inner comment roundtrip matches putout native roundtrip', async (t) => {
    const src = 'const o = {/* inner */};\n';
    const db = await parse('t.js', src);
    const result = await print('t.js', db);
    
    const {default: putout} = await import('putout');
    const native = putout.print(putout.parse(src));
    
    t.equal(result, native);
    t.end();
});

test('putnik: readComments: comment with missing node is skipped', async (t) => {
    const db = await parse('t.js', '// top\nconst a = 1;');
    
    db.run(`INSERT INTO Comments (file, node_id, node_type, type, value, start_line, start_col)
           VALUES (?, ?, ?, ?, ?, ?, ?)`, [
        't.js',
        999_999,
        'Program',
        'CommentLine',
        ' orphan',
        99,
        0,
    ]);
    
    const ast = await readAst(db, 't.js');
    
    t.ok(ast);
    t.end();
});

test('putnik: print preserves top line comment', async (t) => {
    const db = await parseCommentsDb();
    const result = await print('t.js', db);
    
    t.match(result, '// top');
    t.end();
});

test('putnik: print preserves inline line comment', async (t) => {
    const db = await parseCommentsDb();
    const result = await print('t.js', db);
    
    t.match(result, '// inline');
    t.end();
});

test('putnik: print preserves block comment', async (t) => {
    const db = await parseCommentsDb();
    const result = await print('t.js', db);
    
    t.match(result, '\\/\\* block \\*\\/');
    t.end();
});

test('putnik: print roundtrip matches putout native roundtrip', async (t) => {
    const src = montag`
        // top
        const a = 1; // inline
        /* block */
        function f() {}
    
    `;
    
    const db = await parse('t.js', src);
    const result = await print('t.js', db);
    
    const {default: putout} = await import('putout');
    const ast = putout.parse(src);
    const native = putout.print(ast);
    
    t.equal(result, native);
    t.end();
});
