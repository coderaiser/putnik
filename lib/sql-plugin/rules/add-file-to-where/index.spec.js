import {createTest} from '@putout/test';
import * as plugin from './index.js';

const test = createTest(import.meta.url, {
    plugins: [
        ['add-file-to-where', plugin],
    ],
});

test('sql-plugin: add-file-to-where: report', (t) => {
    t.report('add-file-to-where', `Add "file = :file" to WHERE`);
    t.end();
});

test('sql-plugin: add-file-to-where: transform', (t) => {
    t.transform('add-file-to-where');
    t.end();
});
