import {createTest} from '@putout/test';
import * as plugin from './index.js';

const test = createTest(import.meta.url, {
    plugins: [
        ['add-parent-type-to-join', plugin],
    ],
});

test('sql-plugin: add-parent-type-to-join: report', (t) => {
    t.report('add-parent-type-to-join', `Add 'parent_type' to the comparison with the parent id`);
    t.end();
});

test('sql-plugin: add-parent-type-to-join: transform', (t) => {
    t.transform('add-parent-type-to-join');
    t.end();
});

test('sql-plugin: add-parent-type-to-join: transform: reversed', (t) => {
    t.transform('reversed');
    t.end();
});

test('sql-plugin: add-parent-type-to-join: transform: outer-alias', (t) => {
    t.transform('outer-alias');
    t.end();
});

test('sql-plugin: add-parent-type-to-join: transform: sibling-join', (t) => {
    t.transform('sibling-join');
    t.end();
});

test('sql-plugin: add-parent-type-to-join: transform: in-or', (t) => {
    t.transform('in-or');
    t.end();
});

test('sql-plugin: add-parent-type-to-join: transform: in-and', (t) => {
    t.transform('in-and');
    t.end();
});

test('sql-plugin: add-parent-type-to-join: no report: nodes-parent', (t) => {
    t.noReport('nodes-parent');
    t.end();
});

test('sql-plugin: add-parent-type-to-join: no report: not-node-table', (t) => {
    t.noReport('not-node-table');
    t.end();
});

test('sql-plugin: add-parent-type-to-join: no report: unknown-alias', (t) => {
    t.noReport('unknown-alias');
    t.end();
});

test('sql-plugin: add-parent-type-to-join: no report: no-alias', (t) => {
    t.noReport('no-alias');
    t.end();
});

test('sql-plugin: add-parent-type-to-join: no report: has-parent-type', (t) => {
    t.noReport('has-parent-type');
    t.end();
});

test('sql-plugin: add-parent-type-to-join: no report: has-parent-type-list', (t) => {
    t.noReport('has-parent-type-list');
    t.end();
});

test('sql-plugin: add-parent-type-to-join: no report: siblings', (t) => {
    t.noReport('siblings');
    t.end();
});

test('sql-plugin: add-parent-type-to-join: no report: parameter', (t) => {
    t.noReport('parameter');
    t.end();
});

test('sql-plugin: add-parent-type-to-join: no report: other-field', (t) => {
    t.noReport('other-field');
    t.end();
});

test('sql-plugin: add-parent-type-to-join: no report: not-equal', (t) => {
    t.noReport('not-equal');
    t.end();
});

test('sql-plugin: add-parent-type-to-join: no report: computed', (t) => {
    t.noReport('computed');
    t.end();
});

test('sql-plugin: add-parent-type-to-join: no report: no-from', (t) => {
    t.noReport('no-from');
    t.end();
});

test('sql-plugin: add-parent-type-to-join: no report: reference-alias', (t) => {
    t.noReport('reference-alias');
    t.end();
});

test('sql-plugin: add-parent-type-to-join: transform: other-child-list', (t) => {
    t.transform('other-child-list');
    t.end();
});

test('sql-plugin: add-parent-type-to-join: no report: nested-object', (t) => {
    t.noReport('nested-object');
    t.end();
});

test('sql-plugin: add-parent-type-to-join: no report: as-member', (t) => {
    t.noReport('as-member');
    t.end();
});

test('sql-plugin: add-parent-type-to-join: transform: other-leaf', (t) => {
    t.transform('other-leaf');
    t.end();
});
