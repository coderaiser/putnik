import {createTest} from '#putnik/test';
import {loadPlugin} from '../sql-plugin/sql-plugin.js';

const plugin = loadPlugin(new URL('merge-duplicate-imports.sql', import.meta.url).pathname);

const test = createTest(import.meta.url, {
    extension: 'ts',
    plugins: [
        ['merge-duplicate-imports', plugin],
    ],
});

test('plugins: merge-duplicate-imports: process: type', async ({process}) => {
    await process('merge-duplicate-imports-type');
});
