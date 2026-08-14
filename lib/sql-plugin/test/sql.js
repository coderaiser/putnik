import {createTest} from '@putout/test';
import * as plugin from '../rules/index.js';

const test = createTest(import.meta.url, {
    plugins: [
        ['sql', plugin],
    ],
});

test('sql: add-location-to-select: transform', (t) => {
    t.transform('add-location-to-select');
    t.end();
});
