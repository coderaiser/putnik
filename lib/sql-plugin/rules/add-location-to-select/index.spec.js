import {createTest} from '@putout/test';
import * as plugin from './index.js';

const test = createTest(import.meta.url, {
    plugins: [
        ['add-location-to-select', plugin],
    ],
});

test('sql-plugin: add-location-to-select: report', (t) => {
    t.report('add-location-to-select', `Add 'start_line', 'start_col' to @select`);
    t.end();
});

test('sql-plugin: add-location-to-select: transform', (t) => {
    t.transform('add-location-to-select');
    t.end();
});

test('sql-plugin: add-location-to-select: no report: with-location', (t) => {
    t.noReport('with-location');
    t.end();
});

test('sql-plugin: add-location-to-select: transform: from', (t) => {
    t.transform('from');
    t.end();
});

test('sql-plugin: add-location-to-select: no report: member-expression', (t) => {
    t.noReport('member-expression');
    t.end();
});

test('sql-plugin: add-location-to-select: no report: no-section', (t) => {
    t.noReport('no-section');
    t.end();
});

test('sql-plugin: add-location-to-select: no report: wrong-section', (t) => {
    t.noReport('wrong-section');
    t.end();
});

test('sql-plugin: add-location-to-select: no report: wrong-parent', (t) => {
    t.noReport('wrong-parent');
    t.end();
});

test('sql-plugin: add-location-to-select: no report: with-contains', (t) => {
    t.noReport('with-contains');
    t.end();
});

test('sql-plugin: add-location-to-select: transform: with', (t) => {
    t.transform('with');
test('sql-plugin: add-location-to-select: transform: alias-literal', (t) => {
    t.transform('alias-literal');
    t.end();
});

test('sql-plugin: add-location-to-select: transform: alias-reference', (t) => {
    t.transform('alias-reference');
    t.end();
});

    t.end();
});
