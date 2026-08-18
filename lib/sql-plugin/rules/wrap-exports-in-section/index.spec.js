import {createTest} from '@putout/test';
import * as plugin from './index.js';

const test = createTest(import.meta.url, {
    plugins: [
        ['wrap-exports-in-section', plugin],
    ],
});

test('sql-plugin: wrap-exports-in-section: detector', (t) => {
    t.transform('detector');
    t.end();
});

test('sql-plugin: wrap-exports-in-section: report-string', (t) => {
    t.transform('report-string');
    t.end();
});

test('sql-plugin: wrap-exports-in-section: fix-declarative', (t) => {
    t.transform('fix-declarative');
    t.end();
});

test('sql-plugin: wrap-exports-in-section: fix-imperative', (t) => {
    t.transform('fix-imperative');
    t.end();
});