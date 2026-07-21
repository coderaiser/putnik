import {test} from 'supertape';
import {parse} from '@putout/babel';
import {readAst} from '../lib/read-ast.js';
import {
    createDb,
    createAllTables,
    createView,
    writeAst,
} from '../lib/putnik.js';

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
    t.ok(readAst(makeDb('async function f() {}'), 'test.js').program.body[0].async);
    t.end();
});

test('read-ast: FunctionDeclaration async is boolean type', (t) => {
    const result = typeof readAst(makeDb('async function f() {}'), 'test.js').program.body[0].async;
    const expected = 'boolean';
    
    t.equal(result, expected);
    t.end();
});

test('read-ast: FunctionDeclaration generator is false', (t) => {
    t.notOk(readAst(makeDb('async function f() {}'), 'test.js').program.body[0].generator);
    t.end();
});

test('read-ast: FunctionDeclaration generator is boolean type', (t) => {
    const result = typeof readAst(makeDb('async function f() {}'), 'test.js').program.body[0].generator;
    const expected = 'boolean';
    
    t.equal(result, expected);
    t.end();
});

test('read-ast: CallExpression arguments is array', (t) => {
    const result = Array.isArray(readAst(makeDb('f(a, b);'), 'test.js').program.body[0].expression.arguments);
    
    t.ok(result);
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
    const result = readAst(db, 'test.js');
    
    t.notOk(result);
    t.end();
});

test('read-ast: node type not in NODE_FIELDS does not crash', (t) => {
    t.equal(readAst(makeDb('debugger;'), 'test.js').program.body[0].type, 'DebuggerStatement');
    t.end();
});

test('read-ast: MemberExpression computed is boolean', (t) => {
    const result = typeof readAst(makeDb('a[b];'), 'test.js').program.body[0].expression.computed;
    const expected = 'boolean';
    
    t.equal(result, expected);
    t.end();
});

test('read-ast: ObjectProperty shorthand is boolean', (t) => {
    const ast = readAst(makeDb('const o = {a};'), 'test.js');
    const result = typeof ast.program.body[0].declarations[0].init.properties[0].shorthand;
    const expected = 'boolean';
    
    t.equal(result, expected);
    t.end();
});
