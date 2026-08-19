import test from 'supertape';
import {tryCatch} from 'try-catch';
import {parse} from '@putout/babel';
import {
    loadDetectorPlugin,
    getExportReturn,
} from './detector-plugin.js';

const getAst = (source) => parse(source, {
    sourceType: 'module',
});

test('putnik: loadDetectorPlugin: const-to-let: select has file', (t) => {
    const plugin = loadDetectorPlugin(new URL('../plugins/const-to-let.js', import.meta.url).pathname);
    
    t.match(plugin.select, 'file = :file');
    t.end();
});

test('putnik: loadDetectorPlugin: const-to-let: fix has file', (t) => {
    const plugin = loadDetectorPlugin(new URL('../plugins/const-to-let.js', import.meta.url).pathname);
    
    t.match(plugin.fix, 'file = :file');
    t.end();
});

test('putnik: loadDetectorPlugin: const-to-let: report has message', (t) => {
    const plugin = loadDetectorPlugin(new URL('../plugins/const-to-let.js', import.meta.url).pathname);
    
    t.match(plugin.report, 'message');
    t.end();
});

test('putnik: loadDetectorPlugin: routes by extension: js', (t) => {
    const plugin = loadDetectorPlugin(new URL('../plugins/const-to-let.js', import.meta.url).pathname);
    
    t.ok(plugin.select);
    t.end();
});

test('putnik: loadDetectorPlugin: rejects missing detector export', (t) => {
    const [err] = tryCatch(loadDetectorPlugin, new URL('../plugins/fixture/detector/no-detector.js', import.meta.url).pathname);
    
    t.match(err.message, 'detector');
    t.end();
});

test('putnik: loadDetectorPlugin: rejects missing report export', (t) => {
    const [err] = tryCatch(loadDetectorPlugin, new URL('../plugins/fixture/detector/no-report.js', import.meta.url).pathname);
    
    t.match(err.message, 'report');
    t.end();
});

test('putnik: loadDetectorPlugin: rejects missing fix export', (t) => {
    const [err] = tryCatch(loadDetectorPlugin, new URL('../plugins/fixture/detector/no-fix.js', import.meta.url).pathname);
    
    t.match(err.message, 'fix');
    t.end();
});

test('putnik: getExportReturn: returns arrow body', (t) => {
    const ast = getAst('export const detector = () => foo;');
    const result = getExportReturn(ast, 'detector');
    
    t.equal(result.name, 'foo');
    t.end();
});

test('putnik: getExportReturn: skips non-export statements', (t) => {
    const ast = getAst('const a = 1;\nexport const detector = () => foo;');
    const result = getExportReturn(ast, 'detector');
    
    t.equal(result.name, 'foo');
    t.end();
});

test('putnik: getExportReturn: skips non-variable declarations', (t) => {
    const ast = getAst('export function fresh() {}\nexport const detector = () => foo;');
    const result = getExportReturn(ast, 'detector');
    
    t.equal(result.name, 'foo');
    t.end();
});

test('putnik: getExportReturn: skips non-const declarations', (t) => {
    const ast = getAst('export let other = () => foo;\nexport const detector = () => bar;');
    const result = getExportReturn(ast, 'detector');
    
    t.equal(result.name, 'bar');
    t.end();
});

test('putnik: getExportReturn: skips mismatched name', (t) => {
    const ast = getAst('export const other = () => foo;\nexport const detector = () => bar;');
    const result = getExportReturn(ast, 'detector');
    
    t.equal(result.name, 'bar');
    t.end();
});

test('putnik: getExportReturn: skips non-arrow init', (t) => {
    const ast = getAst('export const other = 5;\nexport const detector = () => bar;');
    const result = getExportReturn(ast, 'detector');
    
    t.equal(result.name, 'bar');
    t.end();
});

test('putnik: getExportReturn: skips declarator without id', (t) => {
    const ast = {
        program: {
            body: [{
                type: 'ExportNamedDeclaration',
                declaration: {
                    type: 'VariableDeclaration',
                    kind: 'const',
                    declarations: [{}],
                },
            },
            ...getAst('export const detector = () => foo;').program.body],
        },
    };
    
    const result = getExportReturn(ast, 'detector');
    
    t.equal(result.name, 'foo');
    t.end();
});

test('putnik: getExportReturn: skips declarator without init', (t) => {
    const ast = {
        program: {
            body: [{
                type: 'ExportNamedDeclaration',
                declaration: {
                    type: 'VariableDeclaration',
                    kind: 'const',
                    declarations: [{
                        id: {
                            type: 'Identifier',
                            name: 'detector',
                        },
                    }],
                },
            },
            ...getAst('export const detector = () => foo;').program.body],
        },
    };
    
    const result = getExportReturn(ast, 'detector');
    
    t.equal(result.name, 'foo');
    t.end();
});

test('putnik: getExportReturn: skips non-identifier declarator id', (t) => {
    const ast = getAst('export const {a} = o;\nexport const detector = () => foo;');
    const result = getExportReturn(ast, 'detector');
    
    t.equal(result.name, 'foo');
    t.end();
});

test('putnik: getExportReturn: throws when missing', (t) => {
    const ast = getAst('export const other = () => foo;');
    const [err] = tryCatch(getExportReturn, ast, 'detector');
    
    t.match(err.message, 'detector');
    t.end();
});
