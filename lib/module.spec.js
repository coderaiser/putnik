import {test} from 'supertape';
import putnik, {parse} from './putnik.js';

const getResolved = (db, table) => {
    const [row] = db.all(`SELECT source_resolved FROM ${table}`);
    
    return row.source_resolved;
};

test('module: ImportDeclaration: source_resolved of a relative source', async (t) => {
    const db = await parse('/p/a.js', `import a from './b.js';`);
    
    const result = getResolved(db, 'ImportDeclaration');
    
    t.equal(result, '/p/b.js');
    t.end();
});

test('module: ImportDeclaration: source_resolved of a parent directory', async (t) => {
    const db = await parse('/p/q/a.js', `import a from '../b.js';`);
    
    const result = getResolved(db, 'ImportDeclaration');
    
    t.equal(result, '/p/b.js');
    t.end();
});

test('module: ImportDeclaration: source_resolved is null for a package', async (t) => {
    const db = await parse('/p/a.js', `import a from 'b';`);
    
    const result = getResolved(db, 'ImportDeclaration');
    
    t.notOk(result);
    t.end();
});

test('module: ExportNamedDeclaration: source_resolved of a re-export', async (t) => {
    const db = await parse('/p/a.js', `export {a} from './b.js';`);
    
    const result = getResolved(db, 'ExportNamedDeclaration');
    
    t.equal(result, '/p/b.js');
    t.end();
});

test('module: ExportNamedDeclaration: source_resolved is null without source', async (t) => {
    const db = await parse('/p/a.js', `export const a = 1;`);
    
    const result = getResolved(db, 'ExportNamedDeclaration');
    
    t.notOk(result);
    t.end();
});

test('module: ExportAllDeclaration: source_resolved', async (t) => {
    const db = await parse('/p/a.js', `export * from './b.js';`);
    
    const result = getResolved(db, 'ExportAllDeclaration');
    
    t.equal(result, '/p/b.js');
    t.end();
});

test('module: ImportExpression: source_resolved of import()', async (t) => {
    const db = await parse('/p/a.js', `import('./b.js');`);
    
    const result = getResolved(db, 'ImportExpression');
    
    t.equal(result, '/p/b.js');
    t.end();
});

test('module: ImportExpression: source_resolved is null for a variable', async (t) => {
    const db = await parse('/p/a.js', `import(a);`);
    
    const result = getResolved(db, 'ImportExpression');
    
    t.notOk(result);
    t.end();
});

test('module: CallExpression: source_resolved of require()', async (t) => {
    const db = await parse('/p/a.js', `require('./b.js');`);
    
    const result = getResolved(db, 'CallExpression');
    
    t.equal(result, '/p/b.js');
    t.end();
});

test('module: CallExpression: source_resolved is null for a package', async (t) => {
    const db = await parse('/p/a.js', `require('b');`);
    
    const result = getResolved(db, 'CallExpression');
    
    t.notOk(result);
    t.end();
});

test('module: CallExpression: source_resolved is null for another call', async (t) => {
    const db = await parse('/p/a.js', `f('./b.js');`);
    
    const result = getResolved(db, 'CallExpression');
    
    t.notOk(result);
    t.end();
});

test('module: CallExpression: source_resolved is null for a variable', async (t) => {
    const db = await parse('/p/a.js', `require(a);`);
    
    const result = getResolved(db, 'CallExpression');
    
    t.notOk(result);
    t.end();
});

test('module: CallExpression: source_resolved is null without arguments', async (t) => {
    const db = await parse('/p/a.js', `require();`);
    
    const result = getResolved(db, 'CallExpression');
    
    t.notOk(result);
    t.end();
});

test('module: CallExpression: member call is not require', async (t) => {
    const db = await parse('/p/a.js', `a.require('./b.js');`);
    
    const result = getResolved(db, 'CallExpression');
    
    t.notOk(result);
    t.end();
});

test('module: round trip keeps the code', async (t) => {
    const source = `import a from './b.js';\n\nrequire('./c.js');\nimport('./d.js');\n`;
    const [code] = await putnik('/p/a.js', source, {
        fix: true,
        plugins: [],
    });
    
    t.equal(code, source);
    t.end();
});
