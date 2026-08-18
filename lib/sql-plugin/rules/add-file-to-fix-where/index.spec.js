import {createTest} from '@putout/test';
import * as plugin from './index.js';

const test = createTest(import.meta.url, {
    plugins: [
        ['add-file-to-fix-where', plugin],
    ],
});

test('sql-plugin: add-file-to-fix-where: report', (t) => {
    t.report('add-file-to-fix-where', `Add "file = :file" to @fix WHERE`);
    t.end();
});

test('sql-plugin: add-file-to-fix-where: transform', (t) => {
    t.transform('add-file-to-fix-where');
    t.end();
});

test('sql-plugin: add-file-to-fix-where: transform: array-fix', (t) => {
    t.transform('array-fix');
    t.end();
});

test('sql-plugin: add-file-to-fix-where: no report: has-file', (t) => {
    t.noReport('has-file');
    t.end();
});

test('sql-plugin: add-file-to-fix-where: no report: no-parent-stmt', (t) => {
    t.noReport('no-parent-stmt');
    t.end();
});

test('sql-plugin: add-file-to-fix-where: no report: no-section', (t) => {
    t.noReport('no-section');
    t.end();
});

test('sql-plugin: add-file-to-fix-where: no report: wrong-section', (t) => {
    t.noReport('wrong-section');
    t.end();
});

test('sql-plugin: add-file-to-fix-where: no report: empty-where', (t) => {
    t.noReport('empty-where');
    t.end();
});
