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
    
    t.ok(cols.includes('value') && cols.includes('file') && cols.includes('node_id') && cols.includes('type') && cols.includes('leading') && cols.includes('trailing') && cols.includes('start_line') && cols.includes('start_col'));
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
    
    const hasTop = rows.some((r) => r.type === 'CommentLine' && r.value === ' top' && r.leading === 1);
    const hasInline = rows.some((r) => r.type === 'CommentLine' && r.value === ' inline' && r.trailing === 1);
    const hasBlock = rows.some((r) => r.type === 'CommentBlock' && r.value === ' block ');
    
    t.ok(hasTop && hasInline && hasBlock);
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
    
    const rows = db.all('SELECT * FROM Comments WHERE file = ?', ['t.js']);
    t.equal(rows.length, 1);
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
    
    t.ok(decl.leadingComments && decl.trailingComments);
    t.end();
});

test('putnik: readComments: comment with missing node is skipped', async (t) => {
    const db = await parse('t.js', '// top\nconst a = 1;');
    
    db.run(`INSERT INTO Comments (file, node_id, node_type, type, value, start_line, start_col)
           VALUES (?, ?, ?, ?, ?, ?, ?)`, ['t.js', 999999, 'Program', 'CommentLine', ' orphan', 1, 0]);
    
    const ast = await readAst(db, 't.js');
    
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
    
    t.ok(result.includes('// top') && result.includes('// inline') && result.includes('/* block */'));
    t.end();
});

test('putnik: print roundtrip matches putout native roundtrip', async (t) => {
    const src = `// top
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
