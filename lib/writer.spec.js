import {test} from 'supertape';
import {parse} from '@putout/babel';
import {createDb} from './db/sqlite.js';
import {insertNode} from './writer.js';
import {
    createAllTables,
    createView,
    writeAst,
    readAst,
} from './putnik.js';

const parseOpts = {
    sourceType: 'module',
    plugins: ['jsx'],
};

const setup = async (source, opts) => {
    const db = createDb();
    await createAllTables(db);
    await createView(db);
    await writeAst(db, parse(source, opts || parseOpts), 'test.js');
    
    return db;
};

test('writer: ClassPrivateMethod', async (t) => {
    const db = await setup('class Foo { #method() { return 1; } }', {
        sourceType: 'module',
        plugins: ['jsx'],
    });
    
    const ast = await readAst(db, 'test.js');
    
    t.equal(ast.program.body[0].body.body[0].type, 'ClassPrivateMethod');
    t.end();
});

test('writer: ObjectMethod', async (t) => {
    const db = await setup('const o = { foo() { return 1; } };', {
        sourceType: 'module',
        plugins: ['jsx'],
    });
    
    const ast = await readAst(db, 'test.js');
    
    t.equal(ast.program.body[0].declarations[0].init.properties[0].type, 'ObjectMethod');
    t.end();
});

test('writer: ClassProperty', async (t) => {
    const db = await setup('class Foo { x = 1; }', {
        sourceType: 'module',
        plugins: ['jsx'],
    });
    
    const ast = await readAst(db, 'test.js');
    
    t.equal(ast.program.body[0].body.body[0].type, 'ClassProperty');
    t.end();
});

test('writer: OptionalMemberExpression', async (t) => {
    const db = await setup('const a = b?.c;', {
        sourceType: 'module',
        plugins: ['jsx'],
    });
    
    const ast = await readAst(db, 'test.js');
    
    t.equal(ast.program.body[0].declarations[0].init.type, 'OptionalMemberExpression');
    t.end();
});

test('writer: FunctionExpression', async (t) => {
    const db = await setup('const f = function() {};', {
        sourceType: 'module',
        plugins: ['jsx'],
    });
    
    const ast = await readAst(db, 'test.js');
    
    t.equal(ast.program.body[0].declarations[0].init.type, 'FunctionExpression');
    t.end();
});

test('writer: insertNode returns null for unknown type', async (t) => {
    const db = createDb();
    await createAllTables(db);
    await createView(db);
    const loc = {
        start: {
            line: 1,
            column: 0,
        },
        end: {
            line: 1,
            column: 10,
        },
    };
    
    const result = await insertNode(db, 'UnknownNodeType', 'test.js', null, null, null, loc, {});
    
    t.notOk(result);
    t.end();
});

test('writer: writeNode skips child with unknown type', async (t) => {
    const db = createDb();
    await createAllTables(db);
    await createView(db);
    const ast = parse('const a = 1;', {
        sourceType: 'module',
        plugins: ['jsx'],
    });
    
    ast.program.body.push({
        type: 'UnknownNode',
        loc: {
            start: {
                line: 2,
                column: 0,
            },
            end: {
                line: 2,
                column: 5,
            },
        },
    });
    await writeAst(db, ast, 'test.js');
    const result = await readAst(db, 'test.js');
    
    t.ok(result);
    t.end();
});
