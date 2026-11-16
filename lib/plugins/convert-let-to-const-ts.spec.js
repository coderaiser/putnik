import {createTest} from '#putnik/test';
import {loadPlugin} from '../sql-plugin/sql-plugin.js';

const plugin = loadPlugin(new URL('convert-let-to-const.sql', import.meta.url).pathname);

const test = createTest(import.meta.url, {
    extension: 'ts',
    plugins: [
        ['convert-let-to-const', plugin],
    ],
});

test('plugins: convert-let-to-const: no process: declare', async ({noProcess}) => {
    await noProcess('convert-let-to-const-declare-no-report');
});

test('plugins: convert-let-to-const: process: type', async ({process}) => {
    await process('convert-let-to-const-type');
});
