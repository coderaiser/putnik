import {createTest} from '@putout/test';
import * as plugin from './index.js';

const test = createTest(import.meta.url, {
    plugins: [
        ['add-args', plugin],
    ],
});

test('putnik: add-args: report', (t) => {
    t.report('add-args', `Argument 'run' is missing`);
    t.end();
});

test('putnik: add-args: transform', (t) => {
    t.transform('add-args');
    t.end();
});
