import {createTest} from '@putout/test';
import * as plugin from './index.js';

const test = createTest(import.meta.url, {
    plugins: [
        ['expand-typed-update', plugin],
    ],
});

test('sql-plugin: expand-typed-update: report', (t) => {
    t.report('expand-typed-update', `Expand 'update' on 'nodes' to a statement for each node type`);
    t.end();
});

test('sql-plugin: expand-typed-update: transform', (t) => {
    t.transform('expand-typed-update');
    t.end();
});

test('sql-plugin: expand-typed-update: transform: in-array', (t) => {
    t.transform('in-array');
    t.end();
});

test('sql-plugin: expand-typed-update: transform: extra-condition', (t) => {
    t.transform('extra-condition');
    t.end();
});

test('sql-plugin: expand-typed-update: no report: no-list', (t) => {
    t.noReport('no-list');
    t.end();
});

test('sql-plugin: expand-typed-update: no report: no-alias-column', (t) => {
    t.noReport('no-alias-column');
    t.end();
});

test('sql-plugin: expand-typed-update: no report: typed-update', (t) => {
    t.noReport('typed-update');
    t.end();
});

test('sql-plugin: expand-typed-update: no report: other-condition', (t) => {
    t.noReport('other-condition');
    t.end();
});

test('sql-plugin: expand-typed-update: no report: no-where', (t) => {
    t.noReport('no-where');
    t.end();
});

test('sql-plugin: expand-typed-update: no report: no-select', (t) => {
    t.noReport('no-select');
    t.end();
});

test('sql-plugin: expand-typed-update: no report: other-alias-list', (t) => {
    t.noReport('other-alias-list');
    t.end();
});

test('sql-plugin: expand-typed-update: no report: wrong-column', (t) => {
    t.noReport('wrong-column');
    t.end();
});

test('sql-plugin: expand-typed-update: no report: not-select-section', (t) => {
    t.noReport('not-select-section');
    t.end();
});

test('sql-plugin: expand-typed-update: no report: not-literal-alias', (t) => {
    t.noReport('not-literal-alias');
    t.end();
});

test('sql-plugin: expand-typed-update: no report: non-member-column', (t) => {
    t.noReport('non-member-column');
    t.end();
});

test('sql-plugin: expand-typed-update: transform: call-leaf', (t) => {
    t.transform('call-leaf');
    t.end();
});

test('sql-plugin: expand-typed-update: no report: inlist-identifier', (t) => {
    t.noReport('inlist-identifier');
    t.end();
});
