import {test} from 'supertape';
import {createPutnik} from '../lib/putnik.js';

const roundtrip = (source) => {
    const putnik = createPutnik();
    putnik.parse('test.js', source);
    return putnik.print('test.js');
};

test('roundtrip: variable declaration', (t) => {
    t.equal(roundtrip('const a = 1;\n'), 'const a = 1;\n');
    t.end();
});

test('roundtrip: async function', (t) => {
    t.equal(roundtrip('async function f(a, b) {\n    return a + b;\n}\n'), 'async function f(a, b) {\n    return a + b;\n}\n');
    t.end();
});

test('roundtrip: generator function', (t) => {
    t.equal(roundtrip('function* g() {\n    yield 1;\n}\n'), 'function* g() {\n    yield 1;\n}\n');
    t.end();
});

test('roundtrip: class with method', (t) => {
    t.equal(roundtrip('class Foo {\n    bar() {}\n}\n'), 'class Foo {\n    bar() {}\n}\n');
    t.end();
});

test('roundtrip: arrow function', (t) => {
    t.equal(roundtrip('const f = async (a) => a + 1;\n'), 'const f = async (a) => a + 1;\n');
    t.end();
});

test('roundtrip: computed member expression', (t) => {
    t.equal(roundtrip('a[b];\n'), 'a[b];\n');
    t.end();
});

test('roundtrip: shorthand object property', (t) => {
    t.equal(roundtrip('const o = {a};\n'), 'const o = {a};\n');
    t.end();
});
