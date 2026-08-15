import {createTest} from '@putout/test';
import * as plugin from './index.js';

const testLastInsertRowid = createTest(import.meta.url, {
    plugins: [
        ['last-insert-rowid', plugin.rules['last-insert-rowid']],
    ],
});

testLastInsertRowid('convert-sqlite-to-postgres: lastInsertRowid report', (t) => {
    t.report('last-insert-rowid', `Replace last_insert_rowid with lastval for PostgreSQL`);
    t.end();
});

testLastInsertRowid('convert-sqlite-to-postgres: lastInsertRowid transform', (t) => {
    t.transform('last-insert-rowid');
    t.end();
});

const testAutoIncrement = createTest(import.meta.url, {
    plugins: [
        ['auto-increment', plugin.rules['auto-increment']],
    ],
});

testAutoIncrement('convert-sqlite-to-postgres: autoIncrement report', (t) => {
    t.report('auto-increment', `Replace INTEGER + autoIncrement with serial for PostgreSQL`);
    t.end();
});

testAutoIncrement('convert-sqlite-to-postgres: autoIncrement transform', (t) => {
    t.transform('auto-increment');
    t.end();
});
