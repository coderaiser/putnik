import {createTest} from '@putout/test';
import * as plugin from '../convert-nextval-to-auto-increment.js';

const test = createTest(import.meta.url, {
    plugins: [
        ['convert-nextval-to-auto-increment', plugin],
    ],
});

test('convert-postgresql-to-sqlite: convert-nextval-to-auto-increment: report', (t) => {
    t.report('convert-nextval-to-auto-increment', 'Replace nextval with autoIncrement for SQLite');
    t.end();
});

test('convert-postgresql-to-sqlite: convert-nextval-to-auto-increment: transform', (t) => {
    t.transform('convert-nextval-to-auto-increment');
    t.end();
});
