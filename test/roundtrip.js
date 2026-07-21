import {test} from 'supertape';
import {montag} from 'montag';
import {createPutnik} from '../lib/putnik.js';

const roundtrip = (source) => {
    const putnik = createPutnik();
    putnik.parse('test.js', source);
    
    return putnik.print('test.js');
};

test('roundtrip: variable declaration', (t) => {
    const result = roundtrip('const a = 1;\n');
    const expected = 'const a = 1;\n';
    
    t.equal(result, expected);
    t.end();
});

test('roundtrip: async function', (t) => {
    const result = roundtrip('async function f(a, b) {\n    return a + b;\n}\n');
    const expected = 'async function f(a, b) {\n    return a + b;\n}\n';
    
    t.equal(result, expected);
    t.end();
});

test('roundtrip: generator function', (t) => {
    const result = roundtrip('function* g() {\n    yield 1;\n}\n');
    const expected = 'function* g() {\n    yield 1;\n}\n';
    
    t.equal(result, expected);
    t.end();
});

test('roundtrip: class with method', (t) => {
    const result = roundtrip('class Foo {\n    bar() {}\n}\n');
    const expected = 'class Foo {\n    bar() {}\n}\n';
    
    t.equal(result, expected);
    t.end();
});

test('roundtrip: arrow function', (t) => {
    const result = roundtrip('const f = async (a) => a + 1;\n');
    const expected = 'const f = async (a) => a + 1;\n';
    
    t.equal(result, expected);
    t.end();
});

test('roundtrip: computed member expression', (t) => {
    const result = roundtrip('a[b];\n');
    const expected = 'a[b];\n';
    
    t.equal(result, expected);
    t.end();
});

test('roundtrip: shorthand object property', (t) => {
    const result = roundtrip('const o = {a};\n');
    const expected = montag`
        const o = {
            a,
        };\n
    `;
    
    t.equal(result, expected);
    t.end();
});
