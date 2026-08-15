import {createTest} from '@putout/test';
import * as plugin from './index.js';

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
