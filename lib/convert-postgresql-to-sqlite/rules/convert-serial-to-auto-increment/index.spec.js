import {createTest} from '@putout/test';
import * as plugin from '../convert-serial-to-auto-increment.js';

const test = createTest(import.meta.url, {
    plugins: [['convert-serial-to-auto-increment', plugin]],
});

test('convert-postgresql-to-sqlite: convert-serial-to-auto-increment: report', (t) => {
    t.report('convert-serial-to-auto-increment',
        'Replace serial with INTEGER + autoIncrement for SQLite');
    t.end();
});

test('convert-postgresql-to-sqlite: convert-serial-to-auto-increment: transform', (t) => {
    t.transform('convert-serial-to-auto-increment');
    t.end();
});