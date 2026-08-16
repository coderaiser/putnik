import {createTest} from '@putout/test';
import * as plugin from '../convert-create-sequence-to-sqlite.js';

const test = createTest(import.meta.url, {
    plugins: [['convert-create-sequence-to-sqlite', plugin]],
});

test('convert-postgresql-to-sqlite: convert-create-sequence-to-sqlite: report', (t) => {
    t.report('convert-create-sequence-to-sqlite',
        'Remove CREATE SEQUENCE for SQLite');
    t.end();
});

test('convert-postgresql-to-sqlite: convert-create-sequence-to-sqlite: transform', (t) => {
    t.transform('convert-create-sequence-to-sqlite');
    t.end();
});