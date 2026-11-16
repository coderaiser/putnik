import {test} from 'supertape';
import {
    parse,
    printAll,
    transformAll,
} from '../putnik.js';
import {loadPlugin} from '../sql-plugin/sql-plugin.js';

const plugin = loadPlugin(new URL('remove-unused-exports.sql', import.meta.url).pathname);

const PACKAGE = '{"main": "./a.js"}\n';

const analyze = async (files, overrides = {}) => {
    const {fix = false} = overrides;
    const names = Object.keys(files);
    
    const db = await parse(names, Object.values(files));
    
    const places = await transformAll(names, db, {
        fix,
        plugins: [
            ['remove-unused-exports', plugin],
        ],
    });
    
    return {
        places,
        code: await printAll(names, db),
    };
};

test('plugins: remove-unused-exports: report: unused const', async (t) => {
    const {places} = await analyze({
        '/p/a.js': 'export const a = 1;\n',
    });
    
    const [{
        file,
        message,
    }] = places;
    
    const expected = {
        file: '/p/a.js',
        message: 'Export is never imported',
    };
    
    const result = {
        file,
        message,
    };
    
    t.deepEqual(result, expected);
    t.end();
});

test('plugins: remove-unused-exports: report: position', async (t) => {
    const {places} = await analyze({
        '/p/a.js': 'const b = 1;\nexport const a = 1;\n',
    });
    
    const [{position}] = places;
    
    const expected = {
        line: 2,
        column: 0,
    };
    
    t.deepEqual(position, expected);
    t.end();
});

test('plugins: remove-unused-exports: no report: imported', async (t) => {
    const {places} = await analyze({
        '/p/a.js': 'export const a = 1;\n',
        '/p/b.js': `import {a} from './a.js';\na();\n`,
    });
    
    t.equal(places.length, 0);
    t.end();
});

test('plugins: remove-unused-exports: no report: imported with alias', async (t) => {
    const {places} = await analyze({
        '/p/a.js': 'export const a = 1;\n',
        '/p/b.js': `import {a as c} from './a.js';\nc();\n`,
    });
    
    t.equal(places.length, 0);
    t.end();
});

test('plugins: remove-unused-exports: report: another name is imported', async (t) => {
    const {places} = await analyze({
        '/p/a.js': 'export const a = 1;\nexport const b = 2;\n',
        '/p/b.js': `import {a} from './a.js';\na();\n`,
    });
    
    t.equal(places.length, 1);
    t.end();
});

test('plugins: remove-unused-exports: no report: namespace import', async (t) => {
    const {places} = await analyze({
        '/p/a.js': 'export const a = 1;\nexport const b = 2;\n',
        '/p/b.js': `import * as a from './a.js';\na.a();\n`,
    });
    
    t.equal(places.length, 0);
    t.end();
});

test('plugins: remove-unused-exports: no report: export all', async (t) => {
    const {places} = await analyze({
        '/p/a.js': 'export const a = 1;\n',
        '/p/b.js': `export * from './a.js';\n`,
    });
    
    t.equal(places.length, 0);
    t.end();
});

test('plugins: remove-unused-exports: no report: the re-export itself', async (t) => {
    const {places} = await analyze({
        '/p/a.js': 'export const a = 1;\n',
        '/p/b.js': `export {a} from './a.js';\n`,
    });
    
    t.equal(places.length, 0);
    t.end();
});

test('plugins: remove-unused-exports: no report: import without extension', async (t) => {
    const {places} = await analyze({
        '/p/a.ts': 'export const a = 1;\n',
        '/p/b.ts': `import {a} from './a';\na();\n`,
    });
    
    t.equal(places.length, 0);
    t.end();
});

test('plugins: remove-unused-exports: no report: import of a directory', async (t) => {
    const {places} = await analyze({
        '/p/a/index.js': 'export const a = 1;\n',
        '/p/b.js': `import {a} from './a';\na();\n`,
    });
    
    t.equal(places.length, 0);
    t.end();
});

test('plugins: remove-unused-exports: no report: import()', async (t) => {
    const {places} = await analyze({
        '/p/a.js': 'export const a = 1;\n',
        '/p/b.js': `import('./a.js');\n`,
    });
    
    t.equal(places.length, 0);
    t.end();
});

test('plugins: remove-unused-exports: no report: require()', async (t) => {
    const {places} = await analyze({
        '/p/a.js': 'export const a = 1;\n',
        '/p/b.js': `require('./a.js');\n`,
    });
    
    t.equal(places.length, 0);
    t.end();
});

test('plugins: remove-unused-exports: no report: destructuring export', async (t) => {
    const {places} = await analyze({
        '/p/a.js': 'export const {a} = b;\n',
    });
    
    t.equal(places.length, 0);
    t.end();
});

test('plugins: remove-unused-exports: no report: interface', async (t) => {
    const {places} = await analyze({
        '/p/a.ts': 'export interface A {}\n',
    });
    
    t.equal(places.length, 0);
    t.end();
});

test('plugins: remove-unused-exports: no report: anonymous default function', async (t) => {
    const {places} = await analyze({
        '/p/a.js': 'export default function() {}\n',
    });
    
    t.equal(places.length, 0);
    t.end();
});

test('plugins: remove-unused-exports: report: default function', async (t) => {
    const {places} = await analyze({
        '/p/a.js': 'export default function a() {}\n',
    });
    
    t.equal(places.length, 1);
    t.end();
});

test('plugins: remove-unused-exports: no report: default function is imported', async (t) => {
    const {places} = await analyze({
        '/p/a.js': 'export default function a() {}\n',
        '/p/b.js': `import a from './a.js';\na();\n`,
    });
    
    t.equal(places.length, 0);
    t.end();
});

test('plugins: remove-unused-exports: report: export specifier', async (t) => {
    const {places} = await analyze({
        '/p/a.js': 'const a = 1;\nconst b = 2;\nexport {a, b};\n',
        '/p/b.js': `import {a} from './a.js';\na();\n`,
    });
    
    t.equal(places.length, 1);
    t.end();
});

test('plugins: remove-unused-exports: no report: export specifier is imported', async (t) => {
    const {places} = await analyze({
        '/p/a.js': 'const a = 1;\nexport {a};\n',
        '/p/b.js': `import {a} from './a.js';\na();\n`,
    });
    
    t.equal(places.length, 0);
    t.end();
});

test('plugins: remove-unused-exports: no report: export specifier with namespace import', async (t) => {
    const {places} = await analyze({
        '/p/a.js': 'const a = 1;\nexport {a};\n',
        '/p/b.js': `import * as a from './a.js';\na.a();\n`,
    });
    
    t.equal(places.length, 0);
    t.end();
});

test('plugins: remove-unused-exports: no report: default function with namespace import', async (t) => {
    const {places} = await analyze({
        '/p/a.js': 'export default function a() {}\n',
        '/p/b.js': `import * as a from './a.js';\na.default();\n`,
    });
    
    t.equal(places.length, 0);
    t.end();
});

test('plugins: remove-unused-exports: no report: package import', async (t) => {
    const {places} = await analyze({
        '/p/a.js': 'import a from "a";\na();\n',
    });
    
    t.equal(places.length, 0);
    t.end();
});

test('plugins: remove-unused-exports: fix: const', async (t) => {
    const {code} = await analyze({
        '/p/a.js': 'export const a = 1;\n',
    }, {
        fix: true,
    });
    
    const result = code.get('/p/a.js');
    const expected = 'const a = 1;\n';
    
    t.equal(result, expected);
    t.end();
});

test('plugins: remove-unused-exports: fix: function', async (t) => {
    const {code} = await analyze({
        '/p/a.js': 'export function a() {}\n',
    }, {
        fix: true,
    });
    
    const result = code.get('/p/a.js');
    const expected = 'function a() {}\n';
    
    t.equal(result, expected);
    t.end();
});

test('plugins: remove-unused-exports: fix: class', async (t) => {
    const {code} = await analyze({
        '/p/a.js': 'export class A {}\n',
    }, {
        fix: true,
    });
    
    const result = code.get('/p/a.js');
    const expected = 'class A {}\n';
    
    t.equal(result, expected);
    t.end();
});

test('plugins: remove-unused-exports: fix: default function', async (t) => {
    const {code} = await analyze({
        '/p/a.js': 'export default function a() {}\n',
    }, {
        fix: true,
    });
    
    const result = code.get('/p/a.js');
    const expected = 'function a() {}\n';
    
    t.equal(result, expected);
    t.end();
});

test('plugins: remove-unused-exports: fix: one specifier', async (t) => {
    const {code} = await analyze({
        '/p/a.js': 'const a = 1;\nconst b = 2;\nexport {a, b};\n',
        '/p/b.js': `import {a} from './a.js';\na();\n`,
    }, {
        fix: true,
    });
    
    const result = code.get('/p/a.js');
    const expected = 'const a = 1;\nconst b = 2;\n\nexport {\n    a,\n};\n';
    
    t.equal(result, expected);
    t.end();
});

test('plugins: remove-unused-exports: fix: the last specifier removes the export', async (t) => {
    const {code} = await analyze({
        '/p/a.js': 'const a = 1;\nexport {a};\n',
    }, {
        fix: true,
    });
    
    const result = code.get('/p/a.js');
    const expected = 'const a = 1;\n';
    
    t.equal(result, expected);
    t.end();
});

test('plugins: remove-unused-exports: fix: keeps the used export', async (t) => {
    const {code} = await analyze({
        '/p/a.js': 'export const a = 1;\nexport const b = 2;\n',
        '/p/b.js': `import {a} from './a.js';\na();\n`,
    }, {
        fix: true,
    });
    
    const result = code.get('/p/a.js');
    const expected = 'export const a = 1;\nconst b = 2;\n';
    
    t.equal(result, expected);
    t.end();
});

test('plugins: remove-unused-exports: report: entry file keeps named export', async (t) => {
    const {places} = await analyze({
        '/p/package.json': PACKAGE,
        '/p/a.js': 'export const a = 1;\n',
    });
    
    const result = places;
    const expected = [];
    
    t.deepEqual(result, expected);
    t.end();
});

test('plugins: remove-unused-exports: report: entry file keeps specifier', async (t) => {
    const {places} = await analyze({
        '/p/package.json': PACKAGE,
        '/p/a.js': 'const a = 1;\nexport {a};\n',
    });
    
    const result = places;
    const expected = [];
    
    t.deepEqual(result, expected);
    t.end();
});

test('plugins: remove-unused-exports: report: entry file keeps default function', async (t) => {
    const {places} = await analyze({
        '/p/package.json': PACKAGE,
        '/p/a.js': 'export default function a() {}\n',
    });
    
    const result = places;
    const expected = [];
    
    t.deepEqual(result, expected);
    t.end();
});

test('plugins: remove-unused-exports: report: other file is still reported', async (t) => {
    const {places} = await analyze({
        '/p/package.json': PACKAGE,
        '/p/a.js': 'export const a = 1;\n',
        '/p/b.js': 'export const b = 1;\n',
    });
    
    const files = [];
    
    for (const {file} of places) {
        files.push(file);
    }
    
    const result = files;
    const expected = ['/p/b.js'];
    
    t.deepEqual(result, expected);
    t.end();
});
