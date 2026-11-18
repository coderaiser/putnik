import {createTest} from '@putout/test';
import * as plugin from './index.js';

const test = createTest(import.meta.url, {
    plugins: [
        ['add-file-to-join', plugin],
    ],
});

test('sql-plugin: add-file-to-join: report', (t) => {
    t.report('add-file-to-join', `Add 'file' to the comparison with the parent id`);
    t.end();
});

test('sql-plugin: add-file-to-join: transform', (t) => {
    t.transform('add-file-to-join');
    t.end();
});

test('sql-plugin: add-file-to-join: transform: join', (t) => {
    t.transform('join');
    t.end();
});

test('sql-plugin: add-file-to-join: transform: typed-child', (t) => {
    t.transform('typed-child');
    t.end();
});

test('sql-plugin: add-file-to-join: transform: reversed', (t) => {
    t.transform('reversed');
    t.end();
});

test('sql-plugin: add-file-to-join: transform: in-or', (t) => {
    t.transform('in-or');
    t.end();
});

test('sql-plugin: add-file-to-join: transform: other-leaf', (t) => {
    t.transform('other-leaf');
    t.end();
});

test('sql-plugin: add-file-to-join: no report: has-file', (t) => {
    t.noReport('has-file');
    t.end();
});

test('sql-plugin: add-file-to-join: no report: has-file-reversed', (t) => {
    t.noReport('has-file-reversed');
    t.end();
});

test('sql-plugin: add-file-to-join: no report: has-file-parameter', (t) => {
    t.noReport('has-file-parameter');
    t.end();
});

test('sql-plugin: add-file-to-join: no report: siblings', (t) => {
    t.noReport('siblings');
    t.end();
});

test('sql-plugin: add-file-to-join: no report: unknown-child', (t) => {
    t.noReport('unknown-child');
    t.end();
});

test('sql-plugin: add-file-to-join: no report: unknown-parent', (t) => {
    t.noReport('unknown-parent');
    t.end();
});

test('sql-plugin: add-file-to-join: no report: not-node-table', (t) => {
    t.noReport('not-node-table');
    t.end();
});

test('sql-plugin: add-file-to-join: no report: not-node-child', (t) => {
    t.noReport('not-node-child');
    t.end();
});

test('sql-plugin: add-file-to-join: no report: not-equal', (t) => {
    t.noReport('not-equal');
    t.end();
});
