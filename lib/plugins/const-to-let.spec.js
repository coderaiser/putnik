import {createTest} from '#putnik/test';
import {loadPlugin} from '../sql-plugin/sql-plugin.js';

const plugin = loadPlugin(new URL('const-to-let.js', import.meta.url).pathname);

const test = createTest(import.meta.url, {
    plugins: [
        ['const-to-let', plugin],
    ],
});

test('plugins: const-to-let: process', async ({process}) => {
    await process('const-to-let');
});

test('plugins: const-to-let: no process', async ({noProcess}) => {
    await noProcess('const-to-let-no-report');
});
