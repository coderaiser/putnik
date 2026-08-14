import {createTest} from '@putout/test';
import * as plugin from './index.js';

const test = createTest(import.meta.url, {
    plugins: [
        ['add-id-to-select', plugin],
    ],
});

test('sql-plugin: add-id-to-select: report', (t) => {
    t.report('add-id-to-select', `Add "id" as first column to @select`);
    t.end();
});

test('sql-plugin: add-id-to-select: transform', (t) => {
    t.transform('add-id-to-select');
    t.end();
});
