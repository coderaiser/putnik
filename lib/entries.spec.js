import {test} from 'supertape';
import {getEntries} from './entries.js';

const FILES = [
    '/p/index.js',
    '/p/lib/a.js',
    '/p/lib/b.js',
    '/p/lib/c/index.js',
    '/p/bin/cli.js',
    '/p/types/index.d.ts',
    '/q/x.js',
];

const get = (pkg) => getEntries('/p/package.json', pkg, FILES);

test('entries: main', (t) => {
    const result = get({
        main: './index.js',
    });
    
    const expected = ['/p/index.js'];
    
    t.deepEqual(result, expected);
    t.end();
});

test('entries: main without extension', (t) => {
    const result = get({
        main: './lib/a',
    });
    
    const expected = ['/p/lib/a.js'];
    
    t.deepEqual(result, expected);
    t.end();
});

test('entries: main is a directory', (t) => {
    const result = get({
        main: './lib/c',
    });
    
    const expected = ['/p/lib/c/index.js'];
    
    t.deepEqual(result, expected);
    t.end();
});

test('entries: module and types', (t) => {
    const result = get({
        module: './lib/a.js',
        types: './types/index.d.ts',
    });
    
    const expected = [
        '/p/lib/a.js',
        '/p/types/index.d.ts',
    ];
    
    t.deepEqual(result, expected);
    t.end();
});

test('entries: typings', (t) => {
    const result = get({
        typings: './types/index.d.ts',
    });
    
    const expected = ['/p/types/index.d.ts'];
    
    t.deepEqual(result, expected);
    t.end();
});

test('entries: bin string', (t) => {
    const result = get({
        bin: './bin/cli.js',
    });
    
    const expected = ['/p/bin/cli.js'];
    
    t.deepEqual(result, expected);
    t.end();
});

test('entries: bin object', (t) => {
    const result = get({
        bin: {
            cli: './bin/cli.js',
        },
    });
    
    const expected = ['/p/bin/cli.js'];
    
    t.deepEqual(result, expected);
    t.end();
});

test('entries: exports string', (t) => {
    const result = get({
        exports: './index.js',
    });
    
    const expected = ['/p/index.js'];
    
    t.deepEqual(result, expected);
    t.end();
});

test('entries: exports conditions', (t) => {
    const result = get({
        exports: {
            '.': {
                import: './lib/a.js',
                require: './lib/b.js',
            },
        },
    });
    
    const expected = [
        '/p/lib/a.js',
        '/p/lib/b.js',
    ];
    
    t.deepEqual(result, expected);
    t.end();
});

test('entries: exports array', (t) => {
    const result = get({
        exports: {
            '.': ['./lib/a.js', './lib/b.js'],
        },
    });
    
    const expected = [
        '/p/lib/a.js',
        '/p/lib/b.js',
    ];
    
    t.deepEqual(result, expected);
    t.end();
});

test('entries: exports wildcard', (t) => {
    const result = get({
        exports: {
            './*': './lib/*.js',
        },
    });
    
    const expected = [
        '/p/lib/a.js',
        '/p/lib/b.js',
        '/p/lib/c/index.js',
    ];
    
    t.deepEqual(result, expected);
    t.end();
});

test('entries: exports null target', (t) => {
    const result = get({
        exports: {
            './internal': null,
        },
    });
    
    const expected = [];
    
    t.deepEqual(result, expected);
    t.end();
});

test('entries: no duplicates', (t) => {
    const result = get({
        main: './index.js',
        module: './index.js',
    });
    
    const expected = ['/p/index.js'];
    
    t.deepEqual(result, expected);
    t.end();
});

test('entries: file outside the package is not an entry', (t) => {
    const result = get({
        main: '../q/x.js',
    });
    
    const expected = [];
    
    t.deepEqual(result, expected);
    t.end();
});

test('entries: empty package', (t) => {
    const result = get({});
    const expected = [];
    
    t.deepEqual(result, expected);
    t.end();
});
