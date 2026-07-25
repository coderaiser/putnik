import {test} from 'supertape';
import {parse, readAst} from './putnik.js';

test('readAst: returns object for valid source', async (t) => {
    const db = await parse('test.js', 'const a = 1;');
    
    t.ok(await readAst(db, 'test.js'));
    t.end();
});

test('readAst: root type is File', async (t) => {
    const db = await parse('test.js', 'const a = 1;');
    
    t.equal((await readAst(db, 'test.js')).type, 'File');
    t.end();
});

test('readAst: program type is Program', async (t) => {
    const db = await parse('test.js', 'const a = 1;');
    
    t.equal((await readAst(db, 'test.js')).program.type, 'Program');
    t.end();
});

test('readAst: VariableDeclaration kind', async (t) => {
    const db = await parse('test.js', 'const a = 1;');
    
    t.equal((await readAst(db, 'test.js')).program.body[0].kind, 'const');
    t.end();
});

test('readAst: Identifier name', async (t) => {
    const db = await parse('test.js', 'const a = 1;');
    
    t.equal((await readAst(db, 'test.js')).program.body[0].declarations[0].id.name, 'a');
    t.end();
});

test('readAst: FunctionDeclaration async is true', async (t) => {
    const db = await parse('test.js', 'async function f() {}');
    
    t.ok((await readAst(db, 'test.js')).program.body[0].async);
    t.end();
});

test('readAst: empty db returns null', async (t) => {
    const db = await parse('test.js', 'const a = 1;');
    
    t.notOk(await readAst(db, 'missing.js'));
    t.end();
});

test('readAst: node type not in NODE_FIELDS does not crash', async (t) => {
    const db = await parse('test.js', 'debugger;');
    
    t.equal((await readAst(db, 'test.js')).program.body[0].type, 'DebuggerStatement');
    t.end();
});

test('readAst: returns null when rows empty for file', async (t) => {
    const db = await parse('a.js', 'const a = 1;');
    
    t.notOk(await readAst(db, 'b.js'));
    t.end();
});
