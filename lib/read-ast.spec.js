import {test} from 'supertape';
import {parse} from '@putout/babel';
import {createDb} from './db/sqlite.js';
import {
    createAllTables,
    writeAst,
    readAst,
} from './putnik.js';

const setup = async (source = 'const a = 1;') => {
    const db = createDb();
    await createAllTables(db);
    await writeAst(db, parse(source), 'test.js');
    
    return db;
};

test('readAst: returns object for valid source', async (t) => {
    t.ok(await readAst(await setup(), 'test.js'));
    t.end();
});

test('readAst: root type is File', async (t) => {
    t.equal((await readAst(await setup(), 'test.js')).type, 'File');
    t.end();
});

test('readAst: program type is Program', async (t) => {
    t.equal((await readAst(await setup(), 'test.js')).program.type, 'Program');
    t.end();
});

test('readAst: VariableDeclaration kind', async (t) => {
    t.equal((await readAst(await setup(), 'test.js')).program.body[0].kind, 'const');
    t.end();
});

test('readAst: Identifier name', async (t) => {
    t.equal((await readAst(await setup(), 'test.js')).program.body[0].declarations[0].id.name, 'a');
    t.end();
});

test('readAst: FunctionDeclaration async is true', async (t) => {
    t.ok((await readAst(await setup('async function f() {}'), 'test.js')).program.body[0].async);
    t.end();
});

test('readAst: empty db returns null', async (t) => {
    const db = createDb();
    await createAllTables(db);
    
    t.notOk(await readAst(db, 'test.js'));
    t.end();
});

test('readAst: node type not in NODE_FIELDS does not crash', async (t) => {
    t.equal((await readAst(await setup('debugger;'), 'test.js')).program.body[0].type, 'DebuggerStatement');
    t.end();
});
