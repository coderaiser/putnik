import {createTest} from '@putout/test';
import * as plugin from './index.js';

const test = createTest(import.meta.url, {
    plugins: [
        ['convert-arithmetic-to-tuple', plugin],
    ],
});

test('sql-plugin: convert-arithmetic-to-tuple: report', (t) => {
    t.report('convert-arithmetic-to-tuple', `Use 'tuple' instead of arithmetic comparison`);
    t.end();
});

test('sql-plugin: convert-arithmetic-to-tuple: transform', (t) => {
    t.transform('convert-arithmetic-to-tuple');
    t.end();
});

test('sql-plugin: convert-arithmetic-to-tuple: transform: less', (t) => {
    t.transform('less');
    t.end();
});

test('sql-plugin: convert-arithmetic-to-tuple: transform: equal', (t) => {
    t.transform('equal');
    t.end();
});

test('sql-plugin: convert-arithmetic-to-tuple: transform: in-where', (t) => {
    t.transform('in-where');
    t.end();
});

test('sql-plugin: convert-arithmetic-to-tuple: no report: different-multiplier', (t) => {
    t.noReport('different-multiplier');
    t.end();
});

test('sql-plugin: convert-arithmetic-to-tuple: no report: one-side', (t) => {
    t.noReport('one-side');
    t.end();
});

test('sql-plugin: convert-arithmetic-to-tuple: no report: not-product', (t) => {
    t.noReport('not-product');
    t.end();
});

test('sql-plugin: convert-arithmetic-to-tuple: no report: not-comparison', (t) => {
    t.noReport('not-comparison');
    t.end();
});

test('sql-plugin: convert-arithmetic-to-tuple: no report: not-number', (t) => {
    t.noReport('not-number');
    t.end();
});

test('sql-plugin: convert-arithmetic-to-tuple: no report: not-sum', (t) => {
    t.noReport('not-sum');
    t.end();
});
