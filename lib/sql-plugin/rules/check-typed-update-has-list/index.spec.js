import {createTest} from '@putout/test';
import * as plugin from './index.js';

const test = createTest(import.meta.url, {
    plugins: [
        ['check-typed-update-has-list', plugin],
    ],
});

test('sql-plugin: check-typed-update-has-list: report: no-list', (t) => {
    t.report('no-list', `Add 'inList' of node types to @select for the update on 'nodes'`);
    t.end();
});

test('sql-plugin: check-typed-update-has-list: report: no-where', (t) => {
    t.report('no-where', `Add 'inList' of node types to @select for the update on 'nodes'`);
    t.end();
});

test('sql-plugin: check-typed-update-has-list: report: no-select', (t) => {
    t.report('no-select', `Add 'inList' of node types to @select for the update on 'nodes'`);
    t.end();
});

test('sql-plugin: check-typed-update-has-list: no report: has-list', (t) => {
    t.noReport('has-list');
    t.end();
});

test('sql-plugin: check-typed-update-has-list: no report: typed-update', (t) => {
    t.noReport('typed-update');
    t.end();
});

test('sql-plugin: check-typed-update-has-list: no transform: no-list', (t) => {
    t.noTransform('no-list');
    t.end();
});
