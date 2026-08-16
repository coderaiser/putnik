import {createTest} from '@putout/test';
import * as plugin from './index.js';

const test = createTest(import.meta.url, {
    plugins: [
        ['convert-with-named-to-sequential', plugin],
    ],
});

test('convert-postgresql-to-sqlite: convert-with-named-to-sequential: report', (t) => {
    t.report('convert-with-named-to-sequential', `Use sequential queries instead of 'WITH'`);
    t.end();
});

test('convert-postgresql-to-sqlite: convert-with-named-to-sequential: transform', (t) => {
    t.transform('convert-with-named-to-sequential');
    t.end();
});
