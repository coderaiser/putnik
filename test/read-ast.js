import {test} from 'supertape';
import {createDb, createAllTables, createView, writeAst} from '../lib/putnik.js';
import {readAst} from '../lib/read-ast.js';
import {parse} from '@putout/babel';

const makeDb = (source) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse(source), 'test.js');
    return db;
};

test('read-ast: returns object for valid source', (t) => {
    t.ok(readAst(makeDb('const a = 1;'), 'test.js'));
    t.end();
});

test('read-ast: root type is File', (t) => {
    t.equal(readAst(makeDb('const a = 1;'), 'test.js').type, 'File');
    t.end();
});

test('read-ast: program type is Program', (t) => {
    t.equal(readAst(makeDb('const a = 1;'), 'test.js').program.type, 'Program');
    t.end();
});

test('read-ast: VariableDeclaration kind', (t) => {
    t.equal(readAst(makeDb('const a = 1;'), 'test.js').program.body[0].kind, 'const');
    t.end();
});

test('read-ast: Identifier name', (t) => {
    t.equal(readAst(makeDb('const a = 1;'), 'test.js').program.body[0].declarations[0].id.name, 'a');
    t.end();
});

test('read-ast: FunctionDeclaration async is true', (t) => {
    t.equal(readAst(makeDb('async function f() {}'), 'test.js').program.body[0].async, true);
    t.end();
});

test('read-ast: FunctionDeclaration async is boolean type', (t) => {
    t.equal(typeof readAst(makeDb('async function f() {}'), 'test.js').program.body[0].async, 'boolean');
    t.end();
});

test('read-ast: FunctionDeclaration generator is false', (t) => {
    t.equal(readAst(makeDb('async function f() {}'), 'test.js').program.body[0].generator, false);
    t.end();
});

test('read-ast: FunctionDeclaration generator is boolean type', (t) => {
    t.equal(typeof readAst(makeDb('async function f() {}'), 'test.js').program.body[0].generator, 'boolean');
    t.end();
});

test('read-ast: CallExpression arguments is array', (t) => {
    t.ok(Array.isArray(readAst(makeDb('f(a, b);'), 'test.js').program.body[0].expression.arguments));
    t.end();
});

test('read-ast: CallExpression arguments length', (t) => {
    t.equal(readAst(makeDb('f(a, b);'), 'test.js').program.body[0].expression.arguments.length, 2);
    t.end();
});

test('read-ast: empty db returns null', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    t.equal(readAst(db, 'test.js'), null);
    t.end();
});

test('read-ast: node type not in NODE_FIELDS does not crash', (t) => {
    t.equal(readAst(makeDb('debugger;'), 'test.js').program.body[0].type, 'DebuggerStatement');
    t.end();
});

test('read-ast: MemberExpression computed is boolean', (t) => {
    t.equal(typeof readAst(makeDb('a[b];'), 'test.js').program.body[0].expression.computed, 'boolean');
    t.end();
});

test('read-ast: ObjectProperty shorthand is boolean', (t) => {
    const ast = readAst(makeDb('const o = {a};'), 'test.js');
    t.equal(typeof ast.program.body[0].declarations[0].init.properties[0].shorthand, 'boolean');
    t.end();
});
