import {createTest} from '@putout/test';
import * as plugin from './index.js';

const test = createTest(import.meta.url, {
    plugins: [
        ['convert-lastval-to-last-insert-rowid', plugin],
    ],
});

test('convert-postgresql-to-sqlite: convert-lastval-to-last-insert-rowid: report', (t) => {
    t.report('convert-lastval-to-last-insert-rowid', 'Replace lastval with lastInsertRowid for SQLite');
    t.end();
});

test('convert-postgresql-to-sqlite: convert-lastval-to-last-insert-rowid: transform', (t) => {
    t.transform('convert-lastval-to-last-insert-rowid');
    t.end();
});
