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

const check = async (t, source) => {
    const result = await roundtrip(source);
    
    t.equal(result, native(source));
};

test('putnik: roundtrip: object pattern', async (t) => {
    await check(t, 'const {a} = b;');
    t.end();
});

test('putnik: roundtrip: object pattern: rename, default, rest', async (t) => {
    await check(t, 'const {a: c, d = 1, ...r} = b;');
    t.end();
});

test('putnik: roundtrip: array pattern', async (t) => {
    await check(t, 'const [a, b] = c;');
    t.end();
});

test('putnik: roundtrip: array pattern: hole', async (t) => {
    await check(t, 'const [a, , b] = c;');
    t.end();
});

test('putnik: roundtrip: array pattern: rest', async (t) => {
    await check(t, 'const [a, ...r] = c;');
    t.end();
});

test('putnik: roundtrip: array expression: hole', async (t) => {
    await check(t, 'const a = [1, , 2];');
    t.end();
});

test('putnik: roundtrip: array expression: no holes', async (t) => {
    await check(t, 'const a = [1, 2];');
    t.end();
});

test('putnik: roundtrip: params pattern', async (t) => {
    await check(t, 'function f({a}, [b]) {}');
    t.end();
});

test('putnik: roundtrip: assignment pattern', async (t) => {
    await check(t, '({a} = b);');
    t.end();
});

test('putnik: roundtrip: for-of pattern', async (t) => {
    await check(t, 'for (const [k, v] of m) {}');
    t.end();
});

test('putnik: roundtrip: catch pattern', async (t) => {
    await check(t, 'try {} catch ({message}) {}');
    t.end();
});

test('putnik: roundtrip: switch', async (t) => {
    await check(t, 'switch (a) { case 1: b(); break; default: c(); }');
    t.end();
});

test('putnik: roundtrip: template literal', async (t) => {
    await check(t, `const s = \`a\${b}c\`;`);
    t.end();
});

test('putnik: roundtrip: template literal: empty', async (t) => {
    await check(t, `const s = \`\`;`);
    t.end();
});

test('putnik: roundtrip: tagged template', async (t) => {
    await check(t, `a\`b\${c}\`;`);
    t.end();
});

test('putnik: roundtrip: boolean literals', async (t) => {
    await check(t, 'const a = [true, false];');
    t.end();
});

test('putnik: roundtrip: bigint', async (t) => {
    await check(t, 'const a = 10n;');
    t.end();
});

test('putnik: roundtrip: zero', async (t) => {
    await check(t, 'const a = 0;');
    t.end();
});

test('putnik: roundtrip: empty string', async (t) => {
    await check(t, `const a = '';`);
    t.end();
});

test('putnik: roundtrip: zero and false as arguments', async (t) => {
    await check(t, `f(0, false, '');`);
    t.end();
});

test('putnik: roundtrip: parentheses', async (t) => {
    await check(t, 'a = b - (c + 1);');
    t.end();
});

test('putnik: roundtrip: parentheses: iife', async (t) => {
    await check(t, '(function() {})();');
    t.end();
});

test('putnik: roundtrip: parentheses: not needed', async (t) => {
    await check(t, 'a = (b);');
    t.end();
});

test('putnik: roundtrip: optional member', async (t) => {
    await check(t, 'a?.b;');
    t.end();
});

test('putnik: roundtrip: optional call', async (t) => {
    await check(t, 'a?.b?.(c);');
    t.end();
});

test('putnik: roundtrip: optional computed', async (t) => {
    await check(t, 'a?.[b];');
    t.end();
});

test('putnik: roundtrip: not optional', async (t) => {
    await check(t, 'a.b(c);');
    t.end();
});

test('putnik: roundtrip: regexp flags', async (t) => {
    await check(t, 'const r = /a/gi;');
    t.end();
});

test('putnik: roundtrip: string escapes', async (t) => {
    await check(t, `const s = 'a\\nb\\'c';`);
    t.end();
});

test('putnik: roundtrip: string double quotes', async (t) => {
    await check(t, 'const s = "a";');
    t.end();
});

test('putnik: roundtrip: numeric raw', async (t) => {
    await check(t, 'const n = [1e8, 0xFF, 1_000];');
    t.end();
});

test('putnik: roundtrip: directive', async (t) => {
    await check(t, `'use strict'; a();`);
    t.end();
});

test('putnik: roundtrip: directive: double quotes', async (t) => {
    await check(t, '"use strict"; a();');
    t.end();
});

test('putnik: roundtrip: interpreter directive', async (t) => {
    await check(t, `#!/usr/bin/env node\na();`);
    t.end();
});

test('putnik: roundtrip: dynamic import', async (t) => {
    await check(t, `import('x');`);
    t.end();
});

test('putnik: roundtrip: import attributes', async (t) => {
    await check(t, `import a from './a.json' with {type: 'json'};`);
    t.end();
});

test('putnik: roundtrip: export attributes', async (t) => {
    await check(t, `export {a} from './a.json' with {type: 'json'};`);
    t.end();
});

test('putnik: roundtrip: class: async private method', async (t) => {
    await check(t, 'class A { async #m() {} }');
    t.end();
});

test('putnik: roundtrip: class: generator private method', async (t) => {
    await check(t, 'class A { *#m() {} }');
    t.end();
});

test('putnik: roundtrip: class', async (t) => {
    await check(t, 'class A extends B { static x = 1; get y() { return 1; } }');
    t.end();
});

test('putnik: roundtrip: class: private', async (t) => {
    await check(t, 'class A { #a = 1; m() { return this.#a; } }');
    t.end();
});
