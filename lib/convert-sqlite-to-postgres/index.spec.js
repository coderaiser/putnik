import {createTest} from '@putout/test';
import * as lastInsertRowid from './rules/last-insert-rowid.js';
import * as autoIncrement from './rules/auto-increment.js';

const testLastInsertRowid = createTest(import.meta.url, {
    plugins: [
        ['last-insert-rowid', lastInsertRowid],
    ],
});

testLastInsertRowid('convert-sqlite-to-postgres: lastInsertRowid report', (t) => {
    t.report('lastInsertRowid', `Replace last_insert_rowid with lastval for PostgreSQL`);
    t.end();
});

testLastInsertRowid('convert-sqlite-to-postgres: lastInsertRowid transform', (t) => {
    t.transform('lastInsertRowid');
    t.end();
});

const testAutoIncrement = createTest(import.meta.url, {
    plugins: [
        ['auto-increment', autoIncrement],
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
