import {createTest} from '@putout/test';
import * as plugin from './index.js';

const test = createTest(import.meta.url, {
    plugins: [
        ['add-id-to-select', plugin],
    ],
});

test('sql-plugin: add-id-to-select: report', (t) => {
    t.report('add-id-to-select', `Add 'id' as first column to @select`);
    t.end();
});

test('sql-plugin: add-id-to-select: transform', (t) => {
    t.transform('add-id-to-select');
    t.end();
});

test('sql-plugin: add-id-to-select: no report: has-id', (t) => {
    t.noReport('has-id');
    t.end();
});

test('sql-plugin: add-id-to-select: no report: member-expression', (t) => {
    t.noReport('member-expression');
    t.end();
});

test('sql-plugin: add-id-to-select: no report: no-section', (t) => {
    t.noReport('no-section');
    t.end();
});

test('sql-plugin: add-id-to-select: no report: wrong-section', (t) => {
    t.noReport('wrong-section');
    t.end();
});

test('sql-plugin: add-id-to-select: no report: wrong-parent', (t) => {
    t.noReport('wrong-parent');
    t.end();
});