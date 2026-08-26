import {createTest} from '@putout/test';
import * as plugin from './index.js';

const test = createTest(import.meta.url, {
    plugins: [
        ['add-file-to-where', plugin],
    ],
});

test('sql-plugin: add-file-to-where: report', (t) => {
    t.report('add-file-to-where', `Add "file = :file" to WHERE`);
    t.end();
});

test('sql-plugin: add-file-to-where: transform', (t) => {
    t.transform('add-file-to-where');
    t.end();
});

test('sql-plugin: add-file-to-where: no report: has-file', (t) => {
    t.noReport('has-file');
    t.end();
});

test('sql-plugin: add-file-to-where: transform: aliased', (t) => {
    t.transform('aliased');
    t.end();
});

test('sql-plugin: add-file-to-where: no report: no-from', (t) => {
    t.noReport('no-from');
    t.end();
});

test('sql-plugin: add-file-to-where: transform: bare-from', (t) => {
    t.transform('bare-from');
    t.end();
});

test('sql-plugin: add-file-to-where: no report: no-select', (t) => {
    t.noReport('no-select');
    t.end();
});

test('sql-plugin: add-file-to-where: no report: no-section', (t) => {
    t.noReport('no-section');
    t.end();
});

test('sql-plugin: add-file-to-where: no report: wrong-parent', (t) => {
    t.noReport('wrong-parent');
    t.end();
});

test('sql-plugin: add-file-to-where: no report: wrong-section', (t) => {
    t.noReport('wrong-section');
    t.end();
test('sql-plugin: add-file-to-where: no report: no-select-call', (t) => {
    t.noReport('no-select-call');
    t.end();
});

test('sql-plugin: add-file-to-where: no report: wrong-select-callee', (t) => {
    t.noReport('wrong-select-callee');
    t.end();
});

});

test('sql-plugin: add-file-to-where: no report: empty-where', (t) => {
    t.noReport('empty-where');
    t.end();
});
