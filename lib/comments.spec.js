import {test} from 'supertape';
import {parse, readAst, print, createCommentsTable} from './putnik.js';
import {createDb} from './db/sqlite.js';
import {writeComments} from './writer.js';

test('putnik: createCommentsTable: creates Comments table with columns', async (t) => {
    const db = createDb();
    
    await createCommentsTable(db);
    
    const cols = db
        .all('PRAGMA table_info(Comments)')
        .map((r) => r.name);
    
    t.ok(cols.includes('value'));
    t.ok(cols.includes('file'));
    t.ok(cols.includes('node_id'));
    t.ok(cols.includes('type'));
    t.ok(cols.includes('leading'));
    t.ok(cols.includes('trailing'));
    t.ok(cols.includes('start_line'));
    t.ok(cols.includes('start_col'));
    t.end();
});

test('putnik: parse writes Comments rows for leading block and trailing line comments', async (t) => {
    const src = `// top
const a = 1; // inline
/* block */
function f() {}
`;
    const db = await parse('t.js', src);
    
    const rows = db.all('SELECT * FROM Comments WHERE file = ?', ['t.js']);
    
    t.ok(rows.length > 2);
    t.ok(rows.some((r) => r.type === 'CommentLine' && r.value === ' top' && r.leading === 1));
    t.ok(rows.some((r) => r.type === 'CommentLine' && r.value === ' inline' && r.trailing === 1));
    t.ok(rows.some((r) => r.type === 'CommentBlock' && r.value === ' block '));
    t.end();
});

test('putnik: parse: leading comment attached as leading=1', async (t) => {
    const db = await parse('t.js', '// leading\nconst a = 1;');
    
    const rows = db.all('SELECT * FROM Comments WHERE file = ?', ['t.js']);
    
    t.ok(rows.some((r) => r.type === 'CommentLine' && r.leading === 1));
    t.end();
});

test('putnik: parse: trailing comment attached as trailing=1', async (t) => {
    const db = await parse('t.js', 'const a = 1; // trailing');
    
    const rows = db.all('SELECT * FROM Comments WHERE file = ?', ['t.js']);
    
    t.ok(rows.some((r) => r.type === 'CommentLine' && r.trailing === 1));
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
                start: {line: 1, column: 0},
                end: {line: 1, column: 5},
            },
        }],
    };
    
    await writeComments(db, node, 't.js', 1, 'ExpressionStatement');
    
    // only the comment WITH loc is stored
    const rows = db.all('SELECT * FROM Comments WHERE file = ?', ['t.js']);
    t.equal(rows.length, 1);
    t.equal(rows[0].type, 'CommentBlock');
    t.end();
});

test('putnik: readComments re-attaches comments to AST nodes', async (t) => {
    const src = `// top
const a = 1; // inline
/* block */
function f() {}
`;
    const db = await parse('t.js', src);
    
    const ast = await readAst(db, 't.js');
    const decl = ast.program.body[0];
    const fn = ast.program.body[1];
    
    t.ok(decl.leadingComments);
    t.ok(decl.trailingComments);
    t.ok(fn.leadingComments);
    t.end();
});

test('putnik: readComments: comment with missing node is skipped', async (t) => {
    const db = await parse('t.js', '// top\nconst a = 1;');
    
    // insert a comment referencing a non-existent node
    db.run(`INSERT INTO Comments (file, node_id, node_type, type, value, start_line, start_col)
           VALUES (?, ?, ?, ?, ?, ?, ?)`, ['t.js', 999999, 'Program', 'CommentLine', ' orphan', 1, 0]);
    
    let ast;
    try {
        ast = await readAst(db, 't.js');
    } catch (e) {
        t.fail(e.message);
    }
    
    t.ok(ast);
    t.end();
});

test('putnik: print preserves comments', async (t) => {
    const src = `// top
const a = 1; // inline
/* block */
function f() {}
`;
    const db = await parse('t.js', src);
    const result = await print('t.js', db);
    
    t.ok(result.includes('// top'));
    t.ok(result.includes('// inline'));
    t.ok(result.includes('/* block */'));
    t.end();
});

test('putnik: print preserves comments exactly (roundtrip)', async (t) => {
    const src = `// top
const a = 1; // inline
/* block */
function f() {}
`;
    const db = await parse('t.js', src);
    
    const result = await print('t.js', db);
    
    t.equal(result, src);
    t.end();
});
