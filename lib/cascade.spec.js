import {test} from 'supertape';
import {loadPlugin} from './sql-plugin/sql-plugin.js';
import {
    parse,
    transform,
    print,
} from './putnik.js';

const load = (name) => loadPlugin(new URL(`plugins/${name}.sql`, import.meta.url).pathname);

const removeConsole = ['remove-console', load('remove-console')];
const applyIsNaN = ['apply-is-nan', load('apply-is-nan')];
const removeUnusedVariables = ['remove-unused-variables', load('remove-unused-variables')];

const count = async (db, table) => {
    const [{n}] = await db.all(`SELECT count(*) AS n FROM ${table}`);
    
    return n;
};

test('putnik: cascade: no place for the removed node', async (t) => {
    const db = await parse('a.js', 'console.log(x === NaN);\nfoo(y === NaN);\n');
    const places = await transform('a.js', db, {
        plugins: [removeConsole, applyIsNaN],
        fix: true,
    });
    
    const result = places.filter(({rule}) => rule === 'apply-is-nan');
    
    db.end();
    
    t.equal(result.length, 1);
    t.end();
});

test('putnik: cascade: unused variable after the removed call', async (t) => {
    const db = await parse('a.js', 'const a = 1;\nconsole.log(a);\n', {
        bindings: true,
    });
    
    await transform('a.js', db, {
        plugins: [removeConsole, removeUnusedVariables],
        fix: true,
    });
    
    const result = await print('a.js', db);
    
    db.end();
    
    t.equal(result.trim(), '');
    t.end();
});

test('putnik: cascade: no node row of the removed statement', async (t) => {
    const db = await parse('a.js', 'foo();\nconsole.log(a);\n');
    
    await transform('a.js', db, {
        plugins: [removeConsole],
        fix: true,
    });
    
    const result = await count(db, 'CallExpression');
    
    db.end();
    
    t.equal(result, 1);
    t.end();
});

test('putnik: cascade: no reference row of the removed statement', async (t) => {
    const db = await parse('a.js', 'const a = 1;\nconsole.log(a);\n', {
        bindings: true,
    });
    
    await transform('a.js', db, {
        plugins: [removeConsole],
        fix: true,
    });
    
    const result = await count(db, 'Reference');
    
    db.end();
    
    t.equal(result, 0);
    t.end();
});

test('putnik: cascade: keep the rows of the other file', async (t) => {
    const db = await parse(['a.js', 'b.js'], [
        'console.log(a);\n',
        'console.log(b);\n',
    ]);
    
    await transform('a.js', db, {
        plugins: [removeConsole],
        fix: true,
    });
    
    const result = await count(db, 'CallExpression');
    
    db.end();
    
    t.equal(result, 1);
    t.end();
});

test('putnik: cascade: no place of the removed node in the next run', async (t) => {
    const db = await parse('a.js', 'console.log(x === NaN);\n');
    
    await transform('a.js', db, {
        plugins: [removeConsole],
        fix: true,
    });
    
    const places = await transform('a.js', db, {
        plugins: [applyIsNaN],
        fix: false,
    });
    
    db.end();
    
    t.equal(places.length, 0);
    t.end();
});
