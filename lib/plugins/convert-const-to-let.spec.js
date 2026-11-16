import {createTest} from '#putnik/test';
import {loadPlugin} from '../sql-plugin/sql-plugin.js';

const plugin = loadPlugin(new URL('convert-const-to-let.sql', import.meta.url).pathname);

const test = createTest(import.meta.url, {
    plugins: [
        ['convert-const-to-let', plugin],
    ],
});

test('plugins: convert-const-to-let: process', async ({process}) => {
    await process('convert-const-to-let');
});

test('plugins: convert-const-to-let: no process', async ({noProcess}) => {
    await noProcess('convert-const-to-let-no-report');
});
