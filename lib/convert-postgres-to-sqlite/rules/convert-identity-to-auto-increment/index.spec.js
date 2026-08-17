import {createTest} from '@putout/test';
import * as plugin from './index.js';

const test = createTest(import.meta.url, {
    plugins: [
        ['convert-identity-to-auto-increment', plugin],
    ],
});

test('convert-postgresql-to-sqlite: convert-identity-to-auto-increment: report', (t) => {
    t.report('convert-identity-to-auto-increment', 'Replace IDENTITY with INTEGER + autoIncrement for SQLite');
    t.end();
});

test('convert-postgresql-to-sqlite: convert-identity-to-auto-increment: transform: always', (t) => {
    t.transform('convert-identity-to-auto-increment');
    t.end();
});

test('convert-postgresql-to-sqlite: convert-identity-to-auto-increment: transform: identity-by-default', (t) => {
    t.transform('identity-by-default');
    t.end();
});
