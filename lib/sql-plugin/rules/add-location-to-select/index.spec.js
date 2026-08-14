import {createTest} from '@putout/test';
import * as plugin from './index.js';

const test = createTest(import.meta.url, {
    plugins: [
        ['add-location-to-select', plugin],
    ],
});

test('sql-plugin: add-location-to-select: report', (t) => {
    t.report('add-location-to-select', `Add 'start_line', 'start_col' to select`);
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

