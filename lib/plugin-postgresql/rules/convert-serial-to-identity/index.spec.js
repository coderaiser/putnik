import {createTest} from '@putout/test';
import * as plugin from './index.js';

const test = createTest(import.meta.url, {
    plugins: [['convert-serial-to-identity', plugin]],
});

test('plugin-postgresql: convert-serial-to-identity: report', (t) => {
    t.report(
        'convert-serial-to-identity',
        'Replace SERIAL with GENERATED ALWAYS AS IDENTITY',
    );
    t.end();
});

test('plugin-postgresql: convert-serial-to-identity: transform', (t) => {
    t.transform('convert-serial-to-identity');
    t.end();
});
