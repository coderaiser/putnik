import {createTest} from '@putout/test';
import * as plugin from './index.js';

const test = createTest(import.meta.url, {
    plugins: [
        ['lastInsertRowid', plugin],
    ],
});

test('convert-sqlite-to-postgres: lastInsertRowid report', (t) => {
    t.report('lastInsertRowid', `Replace last_insert_rowid with lastval for PostgreSQL`);
    t.end();
});

test('convert-sqlite-to-postgres: lastInsertRowid transform', (t) => {
    t.transform('lastInsertRowid');
    t.end();
});
