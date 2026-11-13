import putout from 'putout';
import {test} from 'supertape';
import putnik from './putnik.js';

const native = (source) => putout.print(putout.parse(source));

const roundtrip = async (source) => {
    const [code] = await putnik('test.js', source, {
        fix: true,
        plugins: [],
    });
    
    return code;
};

const CASES = {
    'object pattern': 'const {a} = b;',
    'object pattern: rename, default, rest': 'const {a: c, d = 1, ...r} = b;',
    'array pattern': 'const [a, b] = c;',
    'array pattern: hole': 'const [a, , b] = c;',
    'array pattern: rest': 'const [a, ...r] = c;',
    'array expression: hole': 'const a = [1, , 2];',
    'array expression: no holes': 'const a = [1, 2];',
    'params pattern': 'function f({a}, [b]) {}',
    'assignment pattern': '({a} = b);',
    'for-of pattern': 'for (const [k, v] of m) {}',
    'catch pattern': 'try {} catch ({message}) {}',
    'switch': 'switch (a) { case 1: b(); break; default: c(); }',
    'template literal': 'const s = `a${b}c`;',
    'template literal: empty': 'const s = ``;',
    'tagged template': 'a`b${c}`;',
    'boolean literals': 'const a = [true, false];',
    'bigint': 'const a = 10n;',
    'zero': 'const a = 0;',
    'empty string': `const a = '';`,
    'zero and false as arguments': `f(0, false, '');`,
    'class': 'class A extends B { static x = 1; get y() { return 1; } }',
    'class: private': 'class A { #a = 1; m() { return this.#a; } }',
};

for (const [name, source] of Object.entries(CASES)) {
    test(`putnik: roundtrip: ${name}`, async (t) => {
        const result = await roundtrip(source);
        const expected = native(source);
        
        t.equal(result, expected);
        t.end();
    });
}
