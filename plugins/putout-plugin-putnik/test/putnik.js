import {createTest} from '@putout/test';
import * as plugin from '../lib/index.js';

const test = createTest(import.meta.url, {
    plugins: [
        ['add-args', plugin],
    ],
});

test('putnik: transform: add-args', (t) => {
    t.transform('add-args');
    t.end();
});
