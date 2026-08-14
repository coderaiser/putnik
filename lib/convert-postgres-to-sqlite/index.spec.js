import {createTest} from '@putout/test';
import * as plugin from './index.js';

const test = createTest(import.meta.url, {
    plugins: [
        ['withNamed', plugin],
    ],
});

test('convert-postgres-to-sqlite: withNamed report', (t) => {
    t.report('withNamed', `Replace withNamed with portable sequential inserts`);
    t.end();
});

test('convert-postgres-to-sqlite: withNamed transform', (t) => {
    t.transform('withNamed');
    t.end();
});
